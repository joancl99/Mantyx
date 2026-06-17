import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AlertRow {
  id: string;
  name: string;
  sku: string;
  minStock: number;
  totalStock: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Products whose total stock is at/below their own minStock (or zero) —
    // an aggregate-to-column comparison Prisma cannot express, so the alert
    // page and the KPI counters run in SQL instead of loading every product
    // of the tenant into memory.
    const alertProducts = Prisma.sql`
      SELECT p."id", p."name", p."sku", p."minStock",
             COALESCE(SUM(se."quantity"), 0)::int AS "totalStock"
      FROM "products" p
      LEFT JOIN "stock_entries" se ON se."productId" = p."id"
      WHERE p."companyId" = ${companyId} AND p."isActive" = true
      GROUP BY p."id"
      HAVING COALESCE(SUM(se."quantity"), 0) = 0
          OR (p."minStock" > 0 AND COALESCE(SUM(se."quantity"), 0) <= p."minStock")
    `;

    const [
      totalProducts,
      movementsToday,
      recentMovements,
      alertRows,
      counts,
      warehouseCount,
    ] = await Promise.all([
      this.prisma.product.count({ where: { companyId, isActive: true } }),

      this.prisma.stockMovement.count({
        where: { warehouse: { companyId }, createdAt: { gte: today } },
      }),

      this.prisma.stockMovement.findMany({
        where: { warehouse: { companyId } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
        },
      }),

      // Most critical first: out-of-stock products, then lowest coverage.
      this.prisma.$queryRaw<AlertRow[]>(
        Prisma.sql`${alertProducts} ORDER BY "totalStock" ASC, p."name" ASC LIMIT 5`,
      ),

      this.prisma.$queryRaw<Array<{ lowStock: number; noStock: number }>>(
        Prisma.sql`
            SELECT COUNT(*) FILTER (WHERE t."totalStock" = 0)::int  AS "noStock",
                   COUNT(*) FILTER (WHERE t."totalStock" > 0)::int AS "lowStock"
            FROM (${alertProducts}) AS t
          `,
      ),

      this.prisma.warehouse.count({ where: { companyId } }),
    ]);

    const { lowStock, noStock } = counts[0] ?? { lowStock: 0, noStock: 0 };

    return {
      warehouseCount,
      kpis: { totalProducts, lowStock, noStock, movementsToday },
      alerts: alertRows.map((p) => ({
        id: p.id,
        productName: p.name,
        sku: p.sku,
        totalStock: p.totalStock,
        minStock: p.minStock,
        type: (p.totalStock === 0 ? 'no-stock' : 'low-stock') as
          | 'no-stock'
          | 'low-stock',
      })),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        productName: m.product.name,
        warehouseName: m.warehouse.name,
        createdAt: m.createdAt,
      })),
    };
  }
}

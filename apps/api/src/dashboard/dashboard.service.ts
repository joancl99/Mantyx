import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalProducts, movementsToday, recentMovements, productsWithStock] =
      await Promise.all([
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

        this.prisma.product.findMany({
          where: { companyId, isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            minStock: true,
            stockEntries: { select: { quantity: true } },
          },
        }),
      ]);

    let lowStock = 0;
    let noStock = 0;
    const alerts: Array<{
      id: string;
      productName: string;
      sku: string;
      totalStock: number;
      minStock: number;
      type: 'low-stock' | 'no-stock';
    }> = [];

    for (const p of productsWithStock) {
      const totalStock = p.stockEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (totalStock === 0) {
        noStock++;
        if (alerts.length < 5)
          alerts.push({
            id: p.id,
            productName: p.name,
            sku: p.sku,
            totalStock,
            minStock: p.minStock,
            type: 'no-stock',
          });
      } else if (p.minStock > 0 && totalStock <= p.minStock) {
        lowStock++;
        if (alerts.length < 5)
          alerts.push({
            id: p.id,
            productName: p.name,
            sku: p.sku,
            totalStock,
            minStock: p.minStock,
            type: 'low-stock',
          });
      }
    }

    return {
      kpis: { totalProducts, lowStock, noStock, movementsToday },
      alerts,
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

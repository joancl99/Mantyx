import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { StockAlertsGateway } from './stock-alerts.gateway';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: StockAlertsGateway,
  ) {}

  async createMovement(dto: CreateMovementDto, userId: string, companyId: string) {
    const { productId, warehouseId, type, quantity, fromLocationId, toLocationId, notes } = dto;

    const { movement, product } = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, companyId, isActive: true },
      });
      if (!product) throw new NotFoundException(`Product ${productId} not found`);

      const warehouse = await tx.warehouse.findFirst({
        where: { id: warehouseId, companyId },
      });
      if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

      // Compute previous stock across all locations for this product
      const agg = await tx.stockEntry.aggregate({
        where: { productId },
        _sum: { quantity: true },
      });
      const previousStock = agg._sum.quantity ?? 0;

      let newStock = previousStock;

      if (type === MovementType.INBOUND) {
        newStock = previousStock + quantity;
        if (toLocationId) {
          await tx.stockEntry.upsert({
            where: { productId_variantId_locationId: { productId, variantId: null as unknown as string, locationId: toLocationId } },
            create: { productId, locationId: toLocationId, quantity },
            update: { quantity: { increment: quantity } },
          });
        }
      } else if (type === MovementType.OUTBOUND) {
        if (previousStock < quantity) {
          throw new BadRequestException(
            `Insufficient stock: available ${previousStock}, requested ${quantity}`,
          );
        }
        newStock = previousStock - quantity;
        if (fromLocationId) {
          await tx.stockEntry.update({
            where: { productId_variantId_locationId: { productId, variantId: null as unknown as string, locationId: fromLocationId } },
            data: { quantity: { decrement: quantity } },
          });
        }
      } else if (type === MovementType.TRANSFER) {
        if (!fromLocationId || !toLocationId) {
          throw new BadRequestException('TRANSFER requires fromLocationId and toLocationId');
        }
        await tx.stockEntry.update({
          where: { productId_variantId_locationId: { productId, variantId: null as unknown as string, locationId: fromLocationId } },
          data: { quantity: { decrement: quantity } },
        });
        await tx.stockEntry.upsert({
          where: { productId_variantId_locationId: { productId, variantId: null as unknown as string, locationId: toLocationId } },
          create: { productId, locationId: toLocationId, quantity },
          update: { quantity: { increment: quantity } },
        });
      } else {
        // ADJUSTMENT — set absolute stock at a location
        if (!toLocationId) throw new BadRequestException('ADJUSTMENT requires toLocationId');
        const current = await tx.stockEntry.findFirst({ where: { productId, locationId: toLocationId } });
        const currentQty = current?.quantity ?? 0;
        newStock = previousStock - currentQty + quantity;
        await tx.stockEntry.upsert({
          where: { productId_variantId_locationId: { productId, variantId: null as unknown as string, locationId: toLocationId } },
          create: { productId, locationId: toLocationId, quantity },
          update: { quantity },
        });
      }

      const [movement] = await Promise.all([
        tx.stockMovement.create({
          data: { productId, userId, warehouseId, type, quantity, previousStock, newStock, fromLocationId, toLocationId, notes },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            user: { select: { id: true, name: true, email: true } },
            warehouse: { select: { id: true, name: true } },
          },
        }),
        tx.auditLog.create({
          data: {
            entityType: 'StockMovement',
            entityId: productId,
            action: AuditAction.UPDATE,
            changes: { type, previousStock, newStock, quantity, notes },
            userId,
            companyId,
          },
        }),
      ]);

      return { movement, product };
    });

    // Check low-stock alert after transaction
    const agg = await this.prisma.stockEntry.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true },
    });
    const totalStock = agg._sum.quantity ?? 0;
    if (totalStock <= product.minStock) {
      this.alerts.emitLowStock({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        stock: totalStock,
        minStock: product.minStock,
      });
    }

    return movement;
  }

  async findAll(companyId: string, query: MovementQueryDto) {
    const { page = 1, limit = 20, productId, userId, type, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      warehouse: { companyId },
      ...(productId && { productId }),
      ...(userId && { userId }),
      ...(type && { type }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true, email: true } },
          warehouse: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, warehouse: { companyId } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });
    if (!movement) throw new NotFoundException(`Movement ${id} not found`);
    return movement;
  }

  async getStockByProduct(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true, name: true, sku: true, minStock: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const entries = await this.prisma.stockEntry.findMany({
      where: { productId },
      include: {
        location: {
          include: {
            aisle: { include: { zone: { include: { warehouse: true } } } },
          },
        },
      },
    });

    const total = entries.reduce((sum, e) => sum + e.quantity, 0);
    return { product, total, entries };
  }
}

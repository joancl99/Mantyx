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

  async createMovement(dto: CreateMovementDto, userId: string) {
    const { productId, type, quantity, notes } = dto;

    const { movement, newStock, product } = await this.prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
          throw new NotFoundException(`Product ${productId} not found`);
        }

        const previousStock = product.stock;
        let newStock: number;

        if (type === MovementType.INBOUND) {
          newStock = previousStock + quantity;
        } else if (type === MovementType.OUTBOUND) {
          if (previousStock < quantity) {
            throw new BadRequestException(
              `Insufficient stock: available ${previousStock}, requested ${quantity}`,
            );
          }
          newStock = previousStock - quantity;
        } else {
          // ADJUSTMENT — quantity is the absolute target value
          newStock = quantity;
        }

        const [movement] = await Promise.all([
          tx.stockMovement.create({
            data: { productId, userId, type, quantity, previousStock, newStock, notes },
            include: {
              product: { select: { id: true, name: true, sku: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          }),
          tx.product.update({
            where: { id: productId },
            data: { stock: newStock },
          }),
          tx.auditLog.create({
            data: {
              entityType: 'StockMovement',
              entityId: productId,
              action: AuditAction.UPDATE,
              changes: { type, previousStock, newStock, quantity, notes },
              userId,
            },
          }),
        ]);

        return { movement, newStock, product };
      },
    );

    if (newStock <= product.minStock) {
      this.alerts.emitLowStock({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        stock: newStock,
        minStock: product.minStock,
      });
    }

    return movement;
  }

  async findAll(query: MovementQueryDto) {
    const {
      page = 1,
      limit = 20,
      productId,
      userId,
      type,
      dateFrom,
      dateTo,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
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
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async findOne(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!movement) throw new NotFoundException(`Movement ${id} not found`);
    return movement;
  }
}

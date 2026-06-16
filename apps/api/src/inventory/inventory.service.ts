import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, InventoryCountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddInventoryLineDto } from './dto/add-inventory-line.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UpdateInventoryLineDto } from './dto/update-inventory-line.dto';

const inventoryInclude = {
  warehouse: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { lines: true } },
} satisfies Prisma.InventoryCountInclude;

const inventoryDetailInclude = {
  ...inventoryInclude,
  lines: {
    orderBy: { createdAt: 'asc' },
    include: {
      location: {
        select: {
          id: true,
          code: true,
          aisle: {
            select: {
              id: true,
              name: true,
              zone: {
                select: {
                  id: true,
                  name: true,
                  warehouse: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.InventoryCountInclude;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: InventoryQueryDto) {
    const { page = 1, limit = 20, status, warehouseId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.InventoryCountWhereInput = {
      warehouse: { companyId, ...(warehouseId && { id: warehouseId }) },
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryCount.findMany({
        where,
        skip,
        take: limit,
        include: inventoryInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryCount.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateInventoryCountDto,
  ) {
    await this.findWarehouse(dto.warehouseId, companyId);

    return this.prisma.inventoryCount.create({
      data: {
        name: dto.name,
        warehouseId: dto.warehouseId,
        createdById: userId,
      },
      include: inventoryDetailInclude,
    });
  }

  async findOne(id: string, companyId: string) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, warehouse: { companyId } },
      include: inventoryDetailInclude,
    });
    if (!count) throw new NotFoundException(`Inventory count ${id} not found`);
    return count;
  }

  async start(id: string, companyId: string) {
    const count = await this.findCount(id, companyId);
    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft inventory counts can be started',
      );
    }

    return this.prisma.inventoryCount.update({
      where: { id },
      data: { status: InventoryCountStatus.IN_PROGRESS, startedAt: new Date() },
      include: inventoryDetailInclude,
    });
  }

  async complete(id: string, companyId: string, userId: string) {
    const count = await this.findCount(id, companyId);
    if (count.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress inventory counts can be completed',
      );
    }

    const lines = await this.prisma.inventoryCountLine.findMany({
      where: { inventoryCountId: id },
    });
    if (lines.length === 0) {
      throw new BadRequestException(
        'Inventory count must have at least one line',
      );
    }
    // Narrow `countedQty` to a number here so the difference math below needs no
    // non-null assertion: any uncounted line aborts before the transaction.
    const differences = lines.map((line) => {
      if (line.countedQty === null) {
        throw new BadRequestException('All lines must have counted quantities');
      }
      return { id: line.id, difference: line.countedQty - line.expectedQty };
    });

    return this.prisma.$transaction(async (tx) => {
      await Promise.all(
        differences.map((line) =>
          tx.inventoryCountLine.update({
            where: { id: line.id },
            data: { difference: line.difference },
          }),
        ),
      );

      await tx.auditLog.create({
        data: {
          entityType: 'InventoryCount',
          entityId: id,
          action: AuditAction.UPDATE,
          changes: { status: InventoryCountStatus.COMPLETED },
          // The acting user, not count.createdById — whoever completes the
          // count is who the audit trail must attribute it to.
          userId,
          companyId,
        },
      });

      return tx.inventoryCount.update({
        where: { id },
        data: {
          status: InventoryCountStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: inventoryDetailInclude,
      });
    });
  }

  async cancel(id: string, companyId: string, userId: string) {
    const count = await this.findCount(id, companyId);
    if (
      count.status !== InventoryCountStatus.DRAFT &&
      count.status !== InventoryCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Only draft or in-progress inventory counts can be cancelled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          entityType: 'InventoryCount',
          entityId: id,
          action: AuditAction.UPDATE,
          changes: { status: InventoryCountStatus.CANCELLED },
          userId,
          companyId,
        },
      });

      return tx.inventoryCount.update({
        where: { id },
        data: { status: InventoryCountStatus.CANCELLED },
        include: inventoryDetailInclude,
      });
    });
  }

  async addLine(id: string, companyId: string, dto: AddInventoryLineDto) {
    const count = await this.findMutableCount(id, companyId);
    await this.findLocation(dto.locationId, count.warehouseId, companyId);

    const existingLine = await this.prisma.inventoryCountLine.findFirst({
      where: { inventoryCountId: id, locationId: dto.locationId },
    });
    if (existingLine) {
      throw new ConflictException('Location is already included in this count');
    }

    const expectedQty =
      dto.expectedQty ??
      (await this.getLocationExpectedQty(dto.locationId, companyId));

    try {
      return await this.prisma.inventoryCountLine.create({
        data: { inventoryCountId: id, locationId: dto.locationId, expectedQty },
        include: inventoryDetailInclude.lines.include,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Location is already included in this count',
        );
      }
      throw error;
    }
  }

  async updateLine(
    id: string,
    lineId: string,
    companyId: string,
    dto: UpdateInventoryLineDto,
  ) {
    await this.findMutableCount(id, companyId);
    await this.findLine(lineId, id);

    return this.prisma.inventoryCountLine.update({
      where: { id: lineId },
      data: { countedQty: dto.countedQty, difference: null },
      include: inventoryDetailInclude.lines.include,
    });
  }

  async removeLine(id: string, lineId: string, companyId: string) {
    const count = await this.findCount(id, companyId);
    // Intentional asymmetry vs add/updateLine (DRAFT + IN_PROGRESS): once a
    // count is IN_PROGRESS, lines may be added or counted but never deleted —
    // removing a line would silently discard counting work already recorded.
    // A counted scope is corrected by cancelling the count, not by pruning it.
    if (count.status !== InventoryCountStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft inventory count lines can be removed',
      );
    }
    await this.findLine(lineId, id);
    await this.prisma.inventoryCountLine.delete({ where: { id: lineId } });
    return { id: lineId };
  }

  private async findMutableCount(id: string, companyId: string) {
    const count = await this.findCount(id, companyId);
    if (
      count.status !== InventoryCountStatus.DRAFT &&
      count.status !== InventoryCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Inventory count is read-only');
    }
    return count;
  }

  private async findCount(id: string, companyId: string) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, warehouse: { companyId } },
    });
    if (!count) throw new NotFoundException(`Inventory count ${id} not found`);
    return count;
  }

  private async findWarehouse(id: string, companyId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, companyId, isActive: true },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  private async findLocation(
    locationId: string,
    warehouseId: string,
    companyId: string,
  ) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        aisle: { zone: { warehouse: { id: warehouseId, companyId } } },
      },
    });
    if (!location)
      throw new NotFoundException(`Location ${locationId} not found`);
    return location;
  }

  private async findLine(lineId: string, inventoryCountId: string) {
    const line = await this.prisma.inventoryCountLine.findFirst({
      where: { id: lineId, inventoryCountId },
    });
    if (!line)
      throw new NotFoundException(`Inventory count line ${lineId} not found`);
    return line;
  }

  private async getLocationExpectedQty(locationId: string, companyId: string) {
    const aggregate = await this.prisma.stockEntry.aggregate({
      where: { locationId, product: { companyId } },
      _sum: { quantity: true },
    });
    return aggregate._sum.quantity ?? 0;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

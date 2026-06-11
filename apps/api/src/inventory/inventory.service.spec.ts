import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, InventoryCountStatus, Prisma } from '@prisma/client';
import { createPrismaMock, PrismaMock, row } from '../testing/prisma-mock';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let prisma: PrismaMock;
  let service: InventoryService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InventoryService(prisma);
  });

  it('scopes count detail by company through warehouse ownership', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('count-1', 'company-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.inventoryCount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'count-1', warehouse: { companyId: 'company-1' } },
      }),
    );
  });

  it('rejects line updates when a count is completed', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.COMPLETED }),
    );

    await expect(
      service.updateLine('count-1', 'line-1', 'company-1', { countedQty: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.inventoryCountLine.update).not.toHaveBeenCalled();
  });

  it('rejects removing lines after draft state', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.IN_PROGRESS }),
    );

    await expect(
      service.removeLine('count-1', 'line-1', 'company-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.inventoryCountLine.delete).not.toHaveBeenCalled();
  });

  it('rejects duplicate count lines before creating', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({
        id: 'count-1',
        warehouseId: 'warehouse-1',
        status: InventoryCountStatus.DRAFT,
      }),
    );
    prisma.location.findFirst.mockResolvedValue(row({ id: 'location-1' }));
    prisma.inventoryCountLine.findFirst.mockResolvedValue(
      row({ id: 'line-existing' }),
    );

    await expect(
      service.addLine('count-1', 'company-1', { locationId: 'location-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.inventoryCountLine.create).not.toHaveBeenCalled();
  });

  it('maps concurrent duplicate line creation to conflict', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({
        id: 'count-1',
        warehouseId: 'warehouse-1',
        status: InventoryCountStatus.DRAFT,
      }),
    );
    prisma.location.findFirst.mockResolvedValue(row({ id: 'location-1' }));
    prisma.inventoryCountLine.findFirst.mockResolvedValue(null);
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 7 } }),
    );
    prisma.inventoryCountLine.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.addLine('count-1', 'company-1', { locationId: 'location-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('calculates line differences and completes in-progress counts', async () => {
    const count = {
      id: 'count-1',
      status: InventoryCountStatus.IN_PROGRESS,
      createdById: 'user-1',
    };
    const lines = [
      { id: 'line-1', expectedQty: 10, countedQty: 8 },
      { id: 'line-2', expectedQty: 2, countedQty: 5 },
    ];
    prisma.inventoryCount.findFirst.mockResolvedValue(row(count));
    prisma.inventoryCountLine.findMany.mockResolvedValue(row(lines));
    prisma.inventoryCountLine.update.mockResolvedValue(row({}));
    prisma.auditLog.create.mockResolvedValue(row({}));
    prisma.inventoryCount.update.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.COMPLETED }),
    );

    await expect(service.complete('count-1', 'company-1')).resolves.toEqual({
      id: 'count-1',
      status: InventoryCountStatus.COMPLETED,
    });
    expect(prisma.inventoryCountLine.update).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      data: { difference: -2 },
    });
    expect(prisma.inventoryCountLine.update).toHaveBeenCalledWith({
      where: { id: 'line-2' },
      data: { difference: 3 },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditAction.UPDATE,
        companyId: 'company-1',
        entityId: 'count-1',
      }),
    });
  });

  it('cancels an in-progress count and writes the audit row', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.IN_PROGRESS }),
    );
    prisma.auditLog.create.mockResolvedValue(row({}));
    prisma.inventoryCount.update.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.CANCELLED }),
    );

    await expect(
      service.cancel('count-1', 'company-1', 'user-1'),
    ).resolves.toEqual({
      id: 'count-1',
      status: InventoryCountStatus.CANCELLED,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditAction.UPDATE,
        entityType: 'InventoryCount',
        entityId: 'count-1',
        changes: { status: InventoryCountStatus.CANCELLED },
        userId: 'user-1',
        companyId: 'company-1',
      }),
    });
    expect(prisma.inventoryCount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'count-1' },
        data: { status: InventoryCountStatus.CANCELLED },
      }),
    );
  });

  it('rejects cancelling counts that are already completed or cancelled', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.COMPLETED }),
    );

    await expect(
      service.cancel('count-1', 'company-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.inventoryCount.update).not.toHaveBeenCalled();
  });

  it('rejects completion until every line has counted quantity', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(
      row({ id: 'count-1', status: InventoryCountStatus.IN_PROGRESS }),
    );
    prisma.inventoryCountLine.findMany.mockResolvedValue(
      row([{ id: 'line-1', expectedQty: 10, countedQty: null }]),
    );

    await expect(
      service.complete('count-1', 'company-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

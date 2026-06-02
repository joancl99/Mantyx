import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, InventoryCountStatus, Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service';

function createPrismaMock(): any {
  const prisma: any = {
    inventoryCount: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryCountLine: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    warehouse: { findFirst: jest.fn() },
    location: { findFirst: jest.fn() },
    stockEntry: { aggregate: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(prisma)),
  };

  return prisma;
}

describe('InventoryService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: InventoryService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InventoryService(prisma as never);
  });

  it('scopes count detail by company through warehouse ownership', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue(null);

    await expect(service.findOne('count-1', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.inventoryCount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'count-1', warehouse: { companyId: 'company-1' } },
      }),
    );
  });

  it('rejects line updates when a count is completed', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue({
      id: 'count-1',
      status: InventoryCountStatus.COMPLETED,
    });

    await expect(
      service.updateLine('count-1', 'line-1', 'company-1', { countedQty: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.inventoryCountLine.update).not.toHaveBeenCalled();
  });

  it('rejects removing lines after draft state', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue({
      id: 'count-1',
      status: InventoryCountStatus.IN_PROGRESS,
    });

    await expect(service.removeLine('count-1', 'line-1', 'company-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.inventoryCountLine.delete).not.toHaveBeenCalled();
  });

  it('rejects duplicate count lines before creating', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue({
      id: 'count-1',
      warehouseId: 'warehouse-1',
      status: InventoryCountStatus.DRAFT,
    });
    prisma.location.findFirst.mockResolvedValue({ id: 'location-1' });
    prisma.inventoryCountLine.findFirst.mockResolvedValue({ id: 'line-existing' });

    await expect(
      service.addLine('count-1', 'company-1', { locationId: 'location-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.inventoryCountLine.create).not.toHaveBeenCalled();
  });

  it('maps concurrent duplicate line creation to conflict', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue({
      id: 'count-1',
      warehouseId: 'warehouse-1',
      status: InventoryCountStatus.DRAFT,
    });
    prisma.location.findFirst.mockResolvedValue({ id: 'location-1' });
    prisma.inventoryCountLine.findFirst.mockResolvedValue(null);
    prisma.stockEntry.aggregate.mockResolvedValue({ _sum: { quantity: 7 } });
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
    prisma.inventoryCount.findFirst.mockResolvedValue(count);
    prisma.inventoryCountLine.findMany.mockResolvedValue(lines);
    prisma.inventoryCountLine.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
    prisma.inventoryCount.update.mockResolvedValue({ id: 'count-1', status: InventoryCountStatus.COMPLETED });

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

  it('rejects completion until every line has counted quantity', async () => {
    prisma.inventoryCount.findFirst.mockResolvedValue({
      id: 'count-1',
      status: InventoryCountStatus.IN_PROGRESS,
    });
    prisma.inventoryCountLine.findMany.mockResolvedValue([
      { id: 'line-1', expectedQty: 10, countedQty: null },
    ]);

    await expect(service.complete('count-1', 'company-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

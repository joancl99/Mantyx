import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditAction, MovementType } from '@prisma/client';
import { createPrismaMock, PrismaMock, row } from '../testing/prisma-mock';
import { StockService } from './stock.service';

describe('StockService', () => {
  let prisma: PrismaMock;
  let alerts: { emitLowStock: jest.Mock };
  let service: StockService;

  beforeEach(() => {
    prisma = createPrismaMock();
    alerts = { emitLowStock: jest.fn() };
    service = new StockService(prisma, alerts as never);
    prisma.location.findFirst.mockResolvedValue(row({ id: 'location-1' }));
  });

  it('scopes movement detail by company through warehouse ownership', async () => {
    prisma.stockMovement.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('movement-1', 'company-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.stockMovement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'movement-1', warehouse: { companyId: 'company-1' } },
      }),
    );
  });

  it('rejects outbound movement when source location has insufficient stock', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 10 } }),
    );
    prisma.stockEntry.findFirst.mockResolvedValue(
      row({ id: 'entry-1', quantity: 3 }),
    );

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.OUTBOUND,
          quantity: 5,
          fromLocationId: 'location-1',
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.stockEntry.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects inbound movement without a destination location', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 10 } }),
    );

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 5,
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.location.findFirst).not.toHaveBeenCalled();
    expect(prisma.stockEntry.upsert).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects outbound movement without a source location', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 10 } }),
    );

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.OUTBOUND,
          quantity: 5,
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.location.findFirst).not.toHaveBeenCalled();
    expect(prisma.stockEntry.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects movement when location is outside the warehouse scope', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 5,
          toLocationId: 'foreign-location',
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'foreign-location',
        aisle: {
          zone: { warehouse: { id: 'warehouse-1', companyId: 'company-1' } },
        },
      },
    });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('rejects transfer when source location has insufficient stock', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 10 } }),
    );
    prisma.stockEntry.findFirst.mockResolvedValue(
      row({ id: 'entry-1', quantity: 1 }),
    );

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.TRANSFER,
          quantity: 2,
          fromLocationId: 'location-1',
          toLocationId: 'location-2',
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.stockEntry.update).not.toHaveBeenCalled();
    expect(prisma.stockEntry.upsert).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('validates both transfer locations against the warehouse scope', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 2 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.location.findFirst
      .mockResolvedValueOnce(row({ id: 'location-1' }))
      .mockResolvedValueOnce(null);

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.TRANSFER,
          quantity: 2,
          fromLocationId: 'location-1',
          toLocationId: 'foreign-location',
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.location.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'location-1',
        aisle: {
          zone: { warehouse: { id: 'warehouse-1', companyId: 'company-1' } },
        },
      },
    });
    expect(prisma.location.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'foreign-location',
        aisle: {
          zone: { warehouse: { id: 'warehouse-1', companyId: 'company-1' } },
        },
      },
    });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('records inbound movement, audit log, and low-stock alert', async () => {
    const product = {
      id: 'product-1',
      name: 'Widget',
      sku: 'W-1',
      minStock: 15,
    };
    const movement = { id: 'movement-1', productId: product.id };
    prisma.product.findFirst.mockResolvedValue(row(product));
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate
      .mockResolvedValueOnce(row({ _sum: { quantity: 5 } }))
      .mockResolvedValueOnce(row({ _sum: { quantity: 8 } }));
    prisma.stockEntry.upsert.mockResolvedValue(row({}));
    prisma.stockMovement.create.mockResolvedValue(row(movement));
    prisma.auditLog.create.mockResolvedValue(row({}));

    await expect(
      service.createMovement(
        {
          productId: product.id,
          warehouseId: 'warehouse-1',
          type: MovementType.INBOUND,
          quantity: 3,
          toLocationId: 'location-1',
          notes: 'Restock',
        },
        'user-1',
        'company-1',
      ),
    ).resolves.toBe(movement);

    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        previousStock: 5,
        newStock: 8,
        quantity: 3,
      }),
      include: expect.any(Object),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditAction.UPDATE,
        companyId: 'company-1',
        entityType: 'StockMovement',
      }),
    });
    expect(alerts.emitLowStock).toHaveBeenCalledWith('company-1', {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      stock: 8,
      minStock: product.minStock,
    });
  });

  it('records a return as an inbound-style increment, never an absolute set', async () => {
    const movement = { id: 'movement-1', productId: 'product-1' };
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 0 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate
      .mockResolvedValueOnce(row({ _sum: { quantity: 100 } }))
      .mockResolvedValueOnce(row({ _sum: { quantity: 105 } }));
    prisma.stockEntry.upsert.mockResolvedValue(row({}));
    prisma.stockMovement.create.mockResolvedValue(row(movement));
    prisma.auditLog.create.mockResolvedValue(row({}));

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.RETURN,
          quantity: 5,
          toLocationId: 'location-1',
        },
        'user-1',
        'company-1',
      ),
    ).resolves.toBe(movement);

    expect(prisma.stockEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { quantity: { increment: 5 } },
      }),
    );
    expect(prisma.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.RETURN,
        previousStock: 100,
        newStock: 105,
      }),
      include: expect.any(Object),
    });
  });

  it('rejects a return without a destination location', async () => {
    prisma.product.findFirst.mockResolvedValue(
      row({ id: 'product-1', name: 'Widget', sku: 'W-1', minStock: 0 }),
    );
    prisma.warehouse.findFirst.mockResolvedValue(row({ id: 'warehouse-1' }));
    prisma.stockEntry.aggregate.mockResolvedValue(
      row({ _sum: { quantity: 10 } }),
    );

    await expect(
      service.createMovement(
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: MovementType.RETURN,
          quantity: 5,
        },
        'user-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.stockEntry.upsert).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('filters stock overview after calculating product totals', async () => {
    prisma.product.findMany.mockResolvedValue(
      row([
        {
          id: 'product-1',
          name: 'Low',
          sku: 'LOW',
          minStock: 5,
          stockEntries: [{ quantity: 2 }, { quantity: 3 }],
        },
        {
          id: 'product-2',
          name: 'Healthy',
          sku: 'OK',
          minStock: 5,
          stockEntries: [{ quantity: 6 }],
        },
      ]),
    );

    await expect(
      service.getOverview('company-1', { lowStock: true }),
    ).resolves.toEqual({
      data: [
        {
          productId: 'product-1',
          name: 'Low',
          sku: 'LOW',
          minStock: 5,
          totalStock: 5,
        },
      ],
      total: 1,
      page: 1,
      limit: 30,
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', isActive: true },
      }),
    );
  });
});

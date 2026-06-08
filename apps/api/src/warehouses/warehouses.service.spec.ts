import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPrismaMock, PrismaMock, row } from '../testing/prisma-mock';
import { WarehousesService } from './warehouses.service';

describe('WarehousesService', () => {
  let prisma: PrismaMock;
  let service: WarehousesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WarehousesService(prisma);
  });

  it('scopes warehouse list by company', async () => {
    prisma.warehouse.findMany.mockResolvedValue([row({ id: 'warehouse-1' })]);

    await expect(service.findAll('company-1')).resolves.toEqual([
      { id: 'warehouse-1' },
    ]);
    expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'company-1' } }),
    );
  });

  it('maps concurrent duplicate warehouse creation to conflict', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);
    prisma.warehouse.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({ name: 'Central' }, 'company-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks warehouse ownership before listing zones', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(
      service.findZones('warehouse-1', 'company-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.zone.findMany).not.toHaveBeenCalled();
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: 'warehouse-1', companyId: 'company-1' },
    });
  });

  it('requires zone and aisle to belong to the requested hierarchy before creating a location', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(
      row({ id: 'warehouse-1', isActive: true }),
    );
    prisma.zone.findFirst.mockResolvedValue(row({ id: 'zone-1' }));
    prisma.aisle.findFirst.mockResolvedValue(null);

    await expect(
      service.createLocation(
        'warehouse-1',
        'zone-1',
        'aisle-1',
        'company-1',
        'A-01-01',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.location.create).not.toHaveBeenCalled();
    expect(prisma.aisle.findFirst).toHaveBeenCalledWith({
      where: { id: 'aisle-1', zoneId: 'zone-1' },
    });
  });

  it('maps duplicate location creation to conflict', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(
      row({ id: 'warehouse-1', isActive: true }),
    );
    prisma.zone.findFirst.mockResolvedValue(row({ id: 'zone-1' }));
    prisma.aisle.findFirst.mockResolvedValue(row({ id: 'aisle-1' }));
    prisma.location.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createLocation(
        'warehouse-1',
        'zone-1',
        'aisle-1',
        'company-1',
        'A-01-01',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps deleting a location with stock to conflict', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(
      row({ id: 'warehouse-1', isActive: true }),
    );
    prisma.zone.findFirst.mockResolvedValue(row({ id: 'zone-1' }));
    prisma.aisle.findFirst.mockResolvedValue(row({ id: 'aisle-1' }));
    prisma.location.findFirst.mockResolvedValue(row({ id: 'location-1' }));
    prisma.location.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: 'test',
        },
      ),
    );

    await expect(
      service.deleteLocation(
        'warehouse-1',
        'zone-1',
        'aisle-1',
        'location-1',
        'company-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resolves the full hierarchy when finding a location by code', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(
      row({ id: 'warehouse-1', isActive: true }),
    );
    prisma.location.findFirst.mockResolvedValue(
      row({
        id: 'location-1',
        code: 'A-01-01',
        aisle: { id: 'aisle-1', zone: { id: 'zone-1' } },
      }),
    );

    await expect(
      service.findLocationByCode('warehouse-1', 'company-1', 'A-01-01'),
    ).resolves.toEqual({
      warehouseId: 'warehouse-1',
      zoneId: 'zone-1',
      aisleId: 'aisle-1',
      locationId: 'location-1',
      code: 'A-01-01',
    });
    expect(prisma.location.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: 'A-01-01',
          aisle: { zone: { warehouseId: 'warehouse-1' } },
        },
      }),
    );
  });

  it('scopes location lookup to the requested warehouse and company', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(
      service.findLocationByCode('warehouse-1', 'company-1', 'A-01-01'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.location.findFirst).not.toHaveBeenCalled();
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: 'warehouse-1', companyId: 'company-1' },
    });
  });

  it('throws when no location matches the scanned code', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(
      row({ id: 'warehouse-1', isActive: true }),
    );
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(
      service.findLocationByCode('warehouse-1', 'company-1', 'NOPE'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

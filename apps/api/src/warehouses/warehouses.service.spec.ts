import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WarehousesService } from './warehouses.service';

function createPrismaMock(): any {
  return {
    warehouse: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    zone: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    aisle: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('WarehousesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WarehousesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WarehousesService(prisma as never);
  });

  it('scopes warehouse list by company', async () => {
    prisma.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);

    await expect(service.findAll('company-1')).resolves.toEqual([{ id: 'warehouse-1' }]);
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

    await expect(service.create({ name: 'Central' }, 'company-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('checks warehouse ownership before listing zones', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.findZones('warehouse-1', 'company-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.zone.findMany).not.toHaveBeenCalled();
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: 'warehouse-1', companyId: 'company-1' },
    });
  });

  it('requires zone and aisle to belong to the requested hierarchy before creating a location', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1', isActive: true });
    prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1' });
    prisma.aisle.findFirst.mockResolvedValue(null);

    await expect(
      service.createLocation('warehouse-1', 'zone-1', 'aisle-1', 'company-1', 'A-01-01'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.location.create).not.toHaveBeenCalled();
    expect(prisma.aisle.findFirst).toHaveBeenCalledWith({
      where: { id: 'aisle-1', zoneId: 'zone-1' },
    });
  });

  it('maps duplicate location creation to conflict', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1', isActive: true });
    prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1' });
    prisma.aisle.findFirst.mockResolvedValue({ id: 'aisle-1' });
    prisma.location.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createLocation('warehouse-1', 'zone-1', 'aisle-1', 'company-1', 'A-01-01'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps deleting a location with stock to conflict', async () => {
    prisma.warehouse.findFirst.mockResolvedValue({ id: 'warehouse-1', isActive: true });
    prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1' });
    prisma.aisle.findFirst.mockResolvedValue({ id: 'aisle-1' });
    prisma.location.findFirst.mockResolvedValue({ id: 'location-1' });
    prisma.location.delete.mockRejectedValue({ code: 'P2003' });

    await expect(
      service.deleteLocation('warehouse-1', 'zone-1', 'aisle-1', 'location-1', 'company-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

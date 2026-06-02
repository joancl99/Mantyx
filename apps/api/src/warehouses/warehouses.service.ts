import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

const WH_SELECT = {
  id: true,
  name: true,
  address: true,
  isActive: true,
  createdAt: true,
  _count: { select: { zones: true } },
};

const ZONE_SELECT = { id: true, name: true, _count: { select: { aisles: true } } };
const AISLE_SELECT = { id: true, name: true, _count: { select: { locations: true } } };
const LOC_SELECT = { id: true, code: true, _count: { select: { stockEntries: true } } };

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Warehouses ────────────────────────────────────────────────────────────────
  async findAll(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: WH_SELECT,
    });
  }

  async create(dto: CreateWarehouseDto, companyId: string) {
    const exists = await this.prisma.warehouse.findFirst({
      where: { companyId, name: dto.name },
    });
    if (exists) throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);
    try {
      return await this.prisma.warehouse.create({ data: { ...dto, companyId }, select: WH_SELECT });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateWarehouseDto, companyId: string) {
    await this.findWarehouse(id, companyId);
    if (dto.name) {
      const conflict = await this.prisma.warehouse.findFirst({
        where: { companyId, name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);
    }
    try {
      return await this.prisma.warehouse.update({ where: { id }, data: dto, select: WH_SELECT });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);
      }
      throw e;
    }
  }

  async toggleActive(id: string, companyId: string) {
    const wh = await this.findWarehouse(id, companyId);
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: !wh.isActive },
      select: WH_SELECT,
    });
  }

  // ── Zones ─────────────────────────────────────────────────────────────────────
  async findZones(warehouseId: string, companyId: string) {
    await this.findWarehouse(warehouseId, companyId);
    return this.prisma.zone.findMany({
      where: { warehouseId },
      orderBy: { name: 'asc' },
      select: ZONE_SELECT,
    });
  }

  async createZone(warehouseId: string, companyId: string, name: string) {
    await this.findWarehouse(warehouseId, companyId);
    try {
      return await this.prisma.zone.create({ data: { name, warehouseId }, select: ZONE_SELECT });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe una zona "${name}"`);
      throw e;
    }
  }

  async renameZone(warehouseId: string, zoneId: string, companyId: string, name: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    try {
      return await this.prisma.zone.update({ where: { id: zoneId }, data: { name }, select: ZONE_SELECT });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe una zona "${name}"`);
      throw e;
    }
  }

  async deleteZone(warehouseId: string, zoneId: string, companyId: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    try {
      await this.prisma.zone.delete({ where: { id: zoneId } });
    } catch (e: any) {
      if (e.code === 'P2003') throw new ConflictException('No se puede eliminar: la zona tiene pasillos');
      throw e;
    }
    return { id: zoneId };
  }

  // ── Aisles ────────────────────────────────────────────────────────────────────
  async findAisles(warehouseId: string, zoneId: string, companyId: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    return this.prisma.aisle.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
      select: AISLE_SELECT,
    });
  }

  async createAisle(warehouseId: string, zoneId: string, companyId: string, name: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    try {
      return await this.prisma.aisle.create({ data: { name, zoneId }, select: AISLE_SELECT });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe un pasillo "${name}"`);
      throw e;
    }
  }

  async renameAisle(
    warehouseId: string,
    zoneId: string,
    aisleId: string,
    companyId: string,
    name: string,
  ) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    try {
      return await this.prisma.aisle.update({ where: { id: aisleId }, data: { name }, select: AISLE_SELECT });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe un pasillo "${name}"`);
      throw e;
    }
  }

  async deleteAisle(warehouseId: string, zoneId: string, aisleId: string, companyId: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    try {
      await this.prisma.aisle.delete({ where: { id: aisleId } });
    } catch (e: any) {
      if (e.code === 'P2003') throw new ConflictException('No se puede eliminar: el pasillo tiene ubicaciones');
      throw e;
    }
    return { id: aisleId };
  }

  // ── Locations ─────────────────────────────────────────────────────────────────
  async findLocations(warehouseId: string, zoneId: string, aisleId: string, companyId: string) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    return this.prisma.location.findMany({
      where: { aisleId },
      orderBy: { code: 'asc' },
      select: LOC_SELECT,
    });
  }

  async createLocation(
    warehouseId: string,
    zoneId: string,
    aisleId: string,
    companyId: string,
    code: string,
  ) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    try {
      return await this.prisma.location.create({ data: { code, aisleId }, select: LOC_SELECT });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe una ubicación "${code}"`);
      throw e;
    }
  }

  async renameLocation(
    warehouseId: string,
    zoneId: string,
    aisleId: string,
    locationId: string,
    companyId: string,
    code: string,
  ) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    await this.findLocationInAisle(locationId, aisleId);
    try {
      return await this.prisma.location.update({
        where: { id: locationId },
        data: { code },
        select: LOC_SELECT,
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Ya existe una ubicación "${code}"`);
      throw e;
    }
  }

  async deleteLocation(
    warehouseId: string,
    zoneId: string,
    aisleId: string,
    locationId: string,
    companyId: string,
  ) {
    await this.findWarehouse(warehouseId, companyId);
    await this.findZoneInWh(zoneId, warehouseId);
    await this.findAisleInZone(aisleId, zoneId);
    await this.findLocationInAisle(locationId, aisleId);
    try {
      await this.prisma.location.delete({ where: { id: locationId } });
    } catch (e: any) {
      if (e.code === 'P2003') throw new ConflictException('No se puede eliminar: hay stock en esta ubicación');
      throw e;
    }
    return { id: locationId };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────
  private async findWarehouse(id: string, companyId: string) {
    const wh = await this.prisma.warehouse.findFirst({ where: { id, companyId } });
    if (!wh) throw new NotFoundException(`Almacén ${id} no encontrado`);
    return wh;
  }

  private async findZoneInWh(zoneId: string, warehouseId: string) {
    const zone = await this.prisma.zone.findFirst({ where: { id: zoneId, warehouseId } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    return zone;
  }

  private async findAisleInZone(aisleId: string, zoneId: string) {
    const aisle = await this.prisma.aisle.findFirst({ where: { id: aisleId, zoneId } });
    if (!aisle) throw new NotFoundException('Pasillo no encontrado');
    return aisle;
  }

  private async findLocationInAisle(locationId: string, aisleId: string) {
    const location = await this.prisma.location.findFirst({ where: { id: locationId, aisleId } });
    if (!location) throw new NotFoundException('Ubicación no encontrada');
    return location;
  }
}

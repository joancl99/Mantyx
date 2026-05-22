import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
        createdAt: true,
        _count: { select: { zones: true } },
      },
    });
  }

  async create(dto: CreateWarehouseDto, companyId: string) {
    const exists = await this.prisma.warehouse.findFirst({
      where: { companyId, name: dto.name },
    });
    if (exists) throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);

    return this.prisma.warehouse.create({
      data: { ...dto, companyId },
      select: { id: true, name: true, address: true, isActive: true, createdAt: true, _count: { select: { zones: true } } },
    });
  }

  async update(id: string, dto: UpdateWarehouseDto, companyId: string) {
    await this.findOne(id, companyId);

    if (dto.name) {
      const conflict = await this.prisma.warehouse.findFirst({
        where: { companyId, name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Ya existe un almacén con el nombre "${dto.name}"`);
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, address: true, isActive: true, createdAt: true, _count: { select: { zones: true } } },
    });
  }

  async toggleActive(id: string, companyId: string) {
    const wh = await this.findOne(id, companyId);
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: !wh.isActive },
      select: { id: true, name: true, address: true, isActive: true, createdAt: true, _count: { select: { zones: true } } },
    });
  }

  private async findOne(id: string, companyId: string) {
    const wh = await this.prisma.warehouse.findFirst({ where: { id, companyId } });
    if (!wh) throw new NotFoundException(`Almacén ${id} no encontrado`);
    return wh;
  }
}

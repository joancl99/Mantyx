import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.brand.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(companyId: string, name: string) {
    try {
      return await this.prisma.brand.create({
        data: { companyId, name },
        select: { id: true, name: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Brand name already exists');
      }
      throw e;
    }
  }

  async rename(companyId: string, id: string, name: string) {
    const item = await this.prisma.brand.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException('Brand not found');

    try {
      return await this.prisma.brand.update({
        where: { id },
        data: { name },
        select: { id: true, name: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Brand name already exists');
      }
      throw e;
    }
  }

  async remove(companyId: string, id: string) {
    const item = await this.prisma.brand.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException('Brand not found');

    try {
      await this.prisma.brand.delete({ where: { id } });
      return { id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('No se puede eliminar: hay productos asociados a esta marca');
      }
      throw e;
    }
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categoryId, brandId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, isActive: true },
      include: productInclude,
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(companyId: string, dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: { ...dto, companyId },
        include: productInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException('SKU already exists');
        if (e.code === 'P2003')
          throw new NotFoundException('Category or brand not found');
      }
      throw e;
    }
  }

  async update(id: string, companyId: string, dto: UpdateProductDto) {
    await this.findOne(id, companyId);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: productInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException('SKU already exists');
        if (e.code === 'P2003')
          throw new NotFoundException('Category or brand not found');
      }
      throw e;
    }
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

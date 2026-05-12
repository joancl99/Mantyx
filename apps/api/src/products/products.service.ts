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
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categoryId, lowStock } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
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

    // lowStock filter: stock <= minStock — applied post-query since Prisma
    // doesn't support column-to-column comparisons in where clauses
    const data = lowStock
      ? items.filter((p) => p.stock <= p.minStock)
      : items;

    return { data, total: lowStock ? data.length : total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product || !product.isActive) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: dto,
        include: productInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('SKU already exists');
        if (e.code === 'P2003') throw new NotFoundException('Category not found');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: productInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('SKU already exists');
        if (e.code === 'P2003') throw new NotFoundException('Category not found');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

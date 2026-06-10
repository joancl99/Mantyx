/// <reference types="multer" />
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { detectImageType } from './image-signature';

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCatalogOwnership(
    companyId: string,
    dto: Partial<Pick<CreateProductDto, 'categoryId' | 'brandId'>>,
  ) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: dto.brandId, companyId },
        select: { id: true },
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }
  }

  async findAll(companyId: string, query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categoryId, brandId } = query;
    const skip = (page - 1) * limit;

    await this.ensureCatalogOwnership(companyId, { categoryId, brandId });

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
    await this.ensureCatalogOwnership(companyId, dto);
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
    await this.ensureCatalogOwnership(companyId, dto);
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

  async uploadImage(id: string, companyId: string, file: Express.Multer.File) {
    // Validate the real content by magic bytes, not the extension/MIME the
    // client claims — a script renamed to .png is rejected here.
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException(
        'El archivo no es una imagen válida (jpg, png o webp)',
      );
    }

    const product = await this.findOne(id, companyId);

    // Delete previous image file if it exists on disk
    if (product.imageUrl) {
      const prevPath = join(process.cwd(), product.imageUrl.replace(/^\//, ''));
      await rm(prevPath, { force: true });
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'products');
    await mkdir(uploadsDir, { recursive: true });

    // Filename uses a random UUID and the detected type's extension, never the
    // user-supplied name.
    const filename = `${randomUUID()}.${type}`;
    await writeFile(join(uploadsDir, filename), file.buffer);

    const imageUrl = `/uploads/products/${filename}`;
    return this.prisma.product.update({
      where: { id },
      data: { imageUrl },
      include: productInclude,
    });
  }
}

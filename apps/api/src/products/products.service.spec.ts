import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

function createPrismaMock(): any {
  return {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: { findFirst: jest.fn() },
    brand: { findFirst: jest.fn() },
  };
}

describe('ProductsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ProductsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProductsService(prisma as never);
  });

  it('scopes product detail by company and active state', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('product-1', 'company-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1', companyId: 'company-1', isActive: true },
      }),
    );
  });

  it('rejects an uploaded file whose content is not a real image', async () => {
    const file = {
      buffer: Buffer.from('<script>alert(1)</script>'),
      originalname: 'evil.png',
    } as Express.Multer.File;

    await expect(
      service.uploadImage('product-1', 'company-1', file),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Fails before touching the DB or the product lookup.
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('rejects creating a product with a category outside the company', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.create('company-1', {
        name: 'Widget',
        sku: 'W-1',
        minStock: 1,
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('rejects listing products with a category outside the company', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.findAll('company-1', { categoryId: 'category-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.product.count).not.toHaveBeenCalled();
  });

  it('rejects updating a product with a brand outside the company', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.brand.findFirst.mockResolvedValue(null);

    await expect(
      service.update('product-1', 'company-1', { brandId: 'brand-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.brand.findFirst).toHaveBeenCalledWith({
      where: { id: 'brand-1', companyId: 'company-1' },
      select: { id: true },
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('maps duplicate SKU creation to conflict', async () => {
    prisma.category.findFirst.mockResolvedValue({ id: 'category-1' });
    prisma.product.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create('company-1', {
        name: 'Widget',
        sku: 'W-1',
        minStock: 1,
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes only after finding an active company product', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.product.update.mockResolvedValue({
      id: 'product-1',
      isActive: false,
    });

    await expect(
      service.remove('product-1', 'company-1'),
    ).resolves.toBeUndefined();
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { isActive: false },
    });
  });
});

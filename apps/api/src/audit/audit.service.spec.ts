import { AuditAction } from '@prisma/client';
import { createPrismaMock, PrismaMock, row } from '../testing/prisma-mock';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let prisma: PrismaMock;
  let service: AuditService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuditService(prisma);
  });

  it('writes an audit entry with normalized optional fields', async () => {
    prisma.auditLog.create.mockResolvedValue(row({}));

    await service.log({
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: 'product-1',
      changes: { name: 'Widget' },
      userId: 'user-1',
      companyId: 'company-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Product',
        entityId: 'product-1',
        changes: { name: 'Widget' },
        userId: 'user-1',
        companyId: 'company-1',
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  });

  it('never lets an audit failure break the business operation', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.log({
        action: AuditAction.LOGIN,
        entityType: 'Auth',
        userId: 'user-1',
        companyId: 'company-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('lists audit entries scoped by company with filters and pagination', async () => {
    prisma.auditLog.findMany.mockResolvedValue(row([{ id: 'audit-1' }]));
    prisma.auditLog.count.mockResolvedValue(5);

    await expect(
      service.findAll('company-1', {
        page: 2,
        limit: 10,
        action: AuditAction.LOGIN,
        entityType: 'Auth',
      }),
    ).resolves.toEqual({
      data: [{ id: 'audit-1' }],
      total: 5,
      page: 2,
      limit: 10,
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          action: AuditAction.LOGIN,
          entityType: 'Auth',
        },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});

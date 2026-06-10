import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Free-form change bag; never include secrets (e.g. passwords). */
  changes?: Record<string, unknown>;
  userId: string;
  companyId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit entry. Auditing must never break the business operation it
   * records, so any failure here is swallowed and logged — never propagated to
   * the caller.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          changes: params.changes as Prisma.InputJsonValue | undefined,
          userId: params.userId,
          companyId: params.companyId ?? null,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log (${params.action} ${params.entityType})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async findAll(companyId: string, query: AuditQueryDto) {
    const { page = 1, limit = 20, action, entityType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(action && { action }),
      ...(entityType && { entityType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }
}

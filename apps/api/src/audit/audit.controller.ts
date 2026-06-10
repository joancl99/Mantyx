import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'List audit log entries (ADMIN, company-scoped)',
  })
  findAll(@CompanyId() companyId: string, @Query() query: AuditQueryDto) {
    return this.audit.findAll(companyId, query);
  }
}

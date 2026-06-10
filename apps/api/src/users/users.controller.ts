import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AuditAction, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';

// An ADMIN provisions worker accounts only — never other ADMINs or the
// platform SUPERADMIN. The company's initial ADMIN is created by the
// SUPERADMIN when the company is created.
const ASSIGNABLE = [Role.MANAGER, Role.OPERATOR, Role.VIEWER];

class CreateUserDto {
  @ApiProperty({ example: 'Juan García' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'juan@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ASSIGNABLE })
  @IsIn(ASSIGNABLE)
  role: Role;
}

class UpdateUserDto {
  @ApiProperty({ example: 'Juan García', required: false })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'juan@empresa.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ enum: ASSIGNABLE, required: false })
  @IsIn(ASSIGNABLE)
  @IsOptional()
  role?: Role;
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users in the company (ADMIN only)' })
  findAll(@CompanyId() companyId: string) {
    return this.users.findAllByCompany(companyId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a user in the company (ADMIN only)' })
  async create(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateUserDto,
  ) {
    const user = await this.users.createCompanyUser(companyId, dto);
    // Never persist the password in the audit trail.
    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      changes: { name: user.name, email: user.email, role: user.role },
      userId,
      companyId,
    });
    return user;
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user name/email/role (ADMIN only)' })
  async update(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.users.updateCompanyUser(companyId, id, dto);
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      changes: { ...dto },
      userId,
      companyId,
    });
    return user;
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle user active/inactive (ADMIN only)' })
  async toggle(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const user = await this.users.toggleActive(companyId, id);
    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      changes: { isActive: user.isActive },
      userId,
      companyId,
    });
    return user;
  }
}

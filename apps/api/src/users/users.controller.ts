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
import { Role } from '@prisma/client';
import { CompanyId } from '../auth/decorators/company-id.decorator';
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
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users in the company (ADMIN only)' })
  findAll(@CompanyId() companyId: string) {
    return this.users.findAllByCompany(companyId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a user in the company (ADMIN only)' })
  create(@CompanyId() companyId: string, @Body() dto: CreateUserDto) {
    return this.users.createCompanyUser(companyId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user name/email/role (ADMIN only)' })
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateCompanyUser(companyId, id, dto);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle user active/inactive (ADMIN only)' })
  toggle(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.users.toggleActive(companyId, id);
  }
}

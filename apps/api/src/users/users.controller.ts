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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { UsersService } from './users.service';

const ASSIGNABLE = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER];

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
  findAll(@CurrentUser() user: JwtPayload) {
    return this.users.findAllByCompany(user.companyId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a user in the company (ADMIN only)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.users.createCompanyUser(user.companyId!, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user name/email/role (ADMIN only)' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateCompanyUser(user.companyId!, id, dto);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle user active/inactive (ADMIN only)' })
  toggle(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.users.toggleActive(user.companyId!, id);
  }
}

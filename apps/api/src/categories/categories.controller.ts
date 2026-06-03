import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { CategoriesService } from './categories.service';

class CategoryNameDto {
  @ApiProperty({ example: 'Electrónica' })
  @IsString()
  @MinLength(1)
  name: string;
}

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories for the company' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.categories.findAll(user.companyId!);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a category (ADMIN, MANAGER)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CategoryNameDto) {
    return this.categories.create(user.companyId!, dto.name);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rename a category (ADMIN, MANAGER)' })
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CategoryNameDto,
  ) {
    return this.categories.rename(user.companyId!, id, dto.name);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a category (ADMIN only)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categories.remove(user.companyId!, id);
  }
}

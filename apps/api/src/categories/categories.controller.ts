import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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
  findAll(@CompanyId() companyId: string) {
    return this.categories.findAll(companyId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a category (ADMIN, MANAGER)' })
  create(@CompanyId() companyId: string, @Body() dto: CategoryNameDto) {
    return this.categories.create(companyId, dto.name);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rename a category (ADMIN, MANAGER)' })
  rename(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: CategoryNameDto,
  ) {
    return this.categories.rename(companyId, id, dto.name);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a category (ADMIN only)' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.categories.remove(companyId, id);
  }
}

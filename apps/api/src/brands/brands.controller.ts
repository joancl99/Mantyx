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
import { BrandsService } from './brands.service';

class BrandNameDto {
  @ApiProperty({ example: 'Nike' })
  @IsString()
  @MinLength(1)
  name: string;
}

@ApiTags('Brands')
@ApiBearerAuth('access-token')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List all brands for the company' })
  findAll(@CompanyId() companyId: string) {
    return this.brands.findAll(companyId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a brand (ADMIN, MANAGER)' })
  create(@CompanyId() companyId: string, @Body() dto: BrandNameDto) {
    return this.brands.create(companyId, dto.name);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rename a brand (ADMIN, MANAGER)' })
  rename(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: BrandNameDto,
  ) {
    return this.brands.rename(companyId, id, dto.name);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a brand (ADMIN only)' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.brands.remove(companyId, id);
  }
}

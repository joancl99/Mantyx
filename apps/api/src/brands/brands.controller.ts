import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
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
  findAll(@CurrentUser() user: JwtPayload) {
    return this.brands.findAll(user.companyId!);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a brand (ADMIN, MANAGER)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: BrandNameDto) {
    return this.brands.create(user.companyId!, dto.name);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rename a brand (ADMIN, MANAGER)' })
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: BrandNameDto,
  ) {
    return this.brands.rename(user.companyId!, id, dto.name);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a brand (ADMIN only)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.brands.remove(user.companyId!, id);
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { BrandsService } from './brands.service';

class CreateBrandDto {
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
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBrandDto) {
    return this.brands.create(user.companyId!, dto.name);
  }
}

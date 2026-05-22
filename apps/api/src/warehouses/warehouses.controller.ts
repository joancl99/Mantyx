import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'List all warehouses for the company' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId!);
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a warehouse' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWarehouseDto) {
    return this.service.create(dto, user.companyId!);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update a warehouse' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.service.update(id, dto, user.companyId!);
  }

  @Patch(':id/toggle-active')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Toggle warehouse active/inactive' })
  toggleActive(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(id, user.companyId!);
  }
}

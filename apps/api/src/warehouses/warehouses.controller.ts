import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ZoneNameDto } from './dto/zone-name.dto';
import { LocationCodeDto } from './dto/location-code.dto';
import { LocationSearchQueryDto } from './dto/location-search-query.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth('access-token')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  // ── Warehouses ────────────────────────────────────────────────────────────────
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

  // ── Zones ─────────────────────────────────────────────────────────────────────
  @Get(':warehouseId/zones')
  @ApiOperation({ summary: 'List zones for a warehouse' })
  findZones(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
  ) {
    return this.service.findZones(wId, u.companyId!);
  }

  @Post(':warehouseId/zones')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a zone' })
  createZone(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.createZone(wId, u.companyId!, dto.name);
  }

  @Patch(':warehouseId/zones/:zoneId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Rename a zone' })
  renameZone(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.renameZone(wId, zId, u.companyId!, dto.name);
  }

  @Delete(':warehouseId/zones/:zoneId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a zone' })
  deleteZone(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
  ) {
    return this.service.deleteZone(wId, zId, u.companyId!);
  }

  // ── Aisles ────────────────────────────────────────────────────────────────────
  @Get(':warehouseId/zones/:zoneId/aisles')
  @ApiOperation({ summary: 'List aisles for a zone' })
  findAisles(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
  ) {
    return this.service.findAisles(wId, zId, u.companyId!);
  }

  @Post(':warehouseId/zones/:zoneId/aisles')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an aisle' })
  createAisle(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.createAisle(wId, zId, u.companyId!, dto.name);
  }

  @Patch(':warehouseId/zones/:zoneId/aisles/:aisleId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Rename an aisle' })
  renameAisle(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.renameAisle(wId, zId, aId, u.companyId!, dto.name);
  }

  @Delete(':warehouseId/zones/:zoneId/aisles/:aisleId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an aisle' })
  deleteAisle(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
  ) {
    return this.service.deleteAisle(wId, zId, aId, u.companyId!);
  }

  // ── Locations ─────────────────────────────────────────────────────────────────
  @Get(':warehouseId/locations/search')
  @ApiOperation({
    summary: 'Find a location by code within a warehouse (scan-to-fill)',
  })
  findLocationByCode(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Query() query: LocationSearchQueryDto,
  ) {
    return this.service.findLocationByCode(wId, u.companyId!, query.code);
  }

  @Get(':warehouseId/zones/:zoneId/aisles/:aisleId/locations')
  @ApiOperation({ summary: 'List locations for an aisle' })
  findLocations(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
  ) {
    return this.service.findLocations(wId, zId, aId, u.companyId!);
  }

  @Post(':warehouseId/zones/:zoneId/aisles/:aisleId/locations')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a location' })
  createLocation(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Body() dto: LocationCodeDto,
  ) {
    return this.service.createLocation(wId, zId, aId, u.companyId!, dto.code);
  }

  @Patch(':warehouseId/zones/:zoneId/aisles/:aisleId/locations/:locationId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a location code' })
  renameLocation(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Param('locationId', ParseUUIDPipe) lId: string,
    @Body() dto: LocationCodeDto,
  ) {
    return this.service.renameLocation(
      wId,
      zId,
      aId,
      lId,
      u.companyId!,
      dto.code,
    );
  }

  @Delete(':warehouseId/zones/:zoneId/aisles/:aisleId/locations/:locationId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a location' })
  deleteLocation(
    @CurrentUser() u: JwtPayload,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Param('locationId', ParseUUIDPipe) lId: string,
  ) {
    return this.service.deleteLocation(wId, zId, aId, lId, u.companyId!);
  }
}

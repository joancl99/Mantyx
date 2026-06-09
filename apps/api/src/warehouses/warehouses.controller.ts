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
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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
  findAll(@CompanyId() companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a warehouse' })
  create(@CompanyId() companyId: string, @Body() dto: CreateWarehouseDto) {
    return this.service.create(dto, companyId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update a warehouse' })
  update(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.service.update(id, dto, companyId);
  }

  @Patch(':id/toggle-active')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Toggle warehouse active/inactive' })
  toggleActive(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActive(id, companyId);
  }

  // ── Zones ─────────────────────────────────────────────────────────────────────
  @Get(':warehouseId/zones')
  @ApiOperation({ summary: 'List zones for a warehouse' })
  findZones(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
  ) {
    return this.service.findZones(wId, companyId);
  }

  @Post(':warehouseId/zones')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a zone' })
  createZone(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.createZone(wId, companyId, dto.name);
  }

  @Patch(':warehouseId/zones/:zoneId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Rename a zone' })
  renameZone(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.renameZone(wId, zId, companyId, dto.name);
  }

  @Delete(':warehouseId/zones/:zoneId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a zone' })
  deleteZone(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
  ) {
    return this.service.deleteZone(wId, zId, companyId);
  }

  // ── Aisles ────────────────────────────────────────────────────────────────────
  @Get(':warehouseId/zones/:zoneId/aisles')
  @ApiOperation({ summary: 'List aisles for a zone' })
  findAisles(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
  ) {
    return this.service.findAisles(wId, zId, companyId);
  }

  @Post(':warehouseId/zones/:zoneId/aisles')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an aisle' })
  createAisle(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.createAisle(wId, zId, companyId, dto.name);
  }

  @Patch(':warehouseId/zones/:zoneId/aisles/:aisleId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Rename an aisle' })
  renameAisle(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Body() dto: ZoneNameDto,
  ) {
    return this.service.renameAisle(wId, zId, aId, companyId, dto.name);
  }

  @Delete(':warehouseId/zones/:zoneId/aisles/:aisleId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an aisle' })
  deleteAisle(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
  ) {
    return this.service.deleteAisle(wId, zId, aId, companyId);
  }

  // ── Locations ─────────────────────────────────────────────────────────────────
  @Get(':warehouseId/locations/search')
  @ApiOperation({
    summary: 'Find a location by code within a warehouse (scan-to-fill)',
  })
  findLocationByCode(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Query() query: LocationSearchQueryDto,
  ) {
    return this.service.findLocationByCode(wId, companyId, query.code);
  }

  @Get(':warehouseId/zones/:zoneId/aisles/:aisleId/locations')
  @ApiOperation({ summary: 'List locations for an aisle' })
  findLocations(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
  ) {
    return this.service.findLocations(wId, zId, aId, companyId);
  }

  @Post(':warehouseId/zones/:zoneId/aisles/:aisleId/locations')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a location' })
  createLocation(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Body() dto: LocationCodeDto,
  ) {
    return this.service.createLocation(wId, zId, aId, companyId, dto.code);
  }

  @Patch(':warehouseId/zones/:zoneId/aisles/:aisleId/locations/:locationId')
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a location code' })
  renameLocation(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Param('locationId', ParseUUIDPipe) lId: string,
    @Body() dto: LocationCodeDto,
  ) {
    return this.service.renameLocation(wId, zId, aId, lId, companyId, dto.code);
  }

  @Delete(':warehouseId/zones/:zoneId/aisles/:aisleId/locations/:locationId')
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a location' })
  deleteLocation(
    @CompanyId() companyId: string,
    @Param('warehouseId', ParseUUIDPipe) wId: string,
    @Param('zoneId', ParseUUIDPipe) zId: string,
    @Param('aisleId', ParseUUIDPipe) aId: string,
    @Param('locationId', ParseUUIDPipe) lId: string,
  ) {
    return this.service.deleteLocation(wId, zId, aId, lId, companyId);
  }
}

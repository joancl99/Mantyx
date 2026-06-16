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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddInventoryLineDto } from './dto/add-inventory-line.dto';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UpdateInventoryLineDto } from './dto/update-inventory-line.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List inventory counts with pagination and filters',
  })
  findAll(@CompanyId() companyId: string, @Query() query: InventoryQueryDto) {
    return this.inventory.findAll(companyId, query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an inventory count' })
  @ApiResponse({ status: 201 })
  create(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateInventoryCountDto,
  ) {
    return this.inventory.create(companyId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory count detail with lines' })
  findOne(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.findOne(id, companyId);
  }

  @Patch(':id/start')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Start a draft inventory count' })
  start(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.start(id, companyId);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Complete an inventory count and calculate differences',
  })
  complete(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.complete(id, companyId, userId);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancel a draft or in-progress inventory count' })
  cancel(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.cancel(id, companyId, userId);
  }

  @Post(':id/lines')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a location line to an inventory count' })
  addLine(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInventoryLineDto,
  ) {
    return this.inventory.addLine(id, companyId, dto);
  }

  @Patch(':id/lines/:lineId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Register counted quantity for a line' })
  updateLine(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateInventoryLineDto,
  ) {
    return this.inventory.updateLine(id, lineId, companyId, dto);
  }

  @Delete(':id/lines/:lineId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a line from a draft inventory count' })
  removeLine(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.inventory.removeLine(id, lineId, companyId);
  }
}

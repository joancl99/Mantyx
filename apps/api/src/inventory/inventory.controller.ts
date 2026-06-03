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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
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
  @ApiOperation({ summary: 'List inventory counts with pagination and filters' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: InventoryQueryDto) {
    return this.inventory.findAll(user.companyId!, query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an inventory count' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInventoryCountDto) {
    return this.inventory.create(user.companyId!, user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory count detail with lines' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.findOne(id, user.companyId!);
  }

  @Patch(':id/start')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Start a draft inventory count' })
  start(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.start(id, user.companyId!);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Complete an inventory count and calculate differences' })
  complete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventory.complete(id, user.companyId!);
  }

  @Post(':id/lines')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a location line to an inventory count' })
  addLine(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInventoryLineDto,
  ) {
    return this.inventory.addLine(id, user.companyId!, dto);
  }

  @Patch(':id/lines/:lineId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Register counted quantity for a line' })
  updateLine(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateInventoryLineDto,
  ) {
    return this.inventory.updateLine(id, lineId, user.companyId!, dto);
  }

  @Delete(':id/lines/:lineId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a line from a draft inventory count' })
  removeLine(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.inventory.removeLine(id, lineId, user.companyId!);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Post('movements')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a stock movement (ADMIN, MANAGER, OPERATOR)',
  })
  @ApiResponse({ status: 201 })
  createMovement(
    @CompanyId() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.stock.createMovement(dto, userId, companyId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List stock movements with filters and pagination' })
  findAll(@CompanyId() companyId: string, @Query() query: MovementQueryDto) {
    return this.stock.findAll(companyId, query);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get a stock movement by id' })
  findOne(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stock.findOne(id, companyId);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Current stock levels for all products' })
  getOverview(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('lowStock', new ParseBoolPipe({ optional: true }))
    lowStock?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.stock.getOverview(companyId, { search, lowStock, page, limit });
  }

  @Get('by-product/:productId')
  @ApiOperation({ summary: 'Get total stock and entries by product' })
  getStockByProduct(
    @CompanyId() companyId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.stock.getStockByProduct(productId, companyId);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementQueryDto } from './dto/movement-query.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a stock movement' })
  @ApiResponse({ status: 201 })
  createMovement(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMovementDto,
  ) {
    return this.stock.createMovement(dto, user.sub, user.companyId!);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List stock movements with filters and pagination' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: MovementQueryDto) {
    return this.stock.findAll(user.companyId!, query);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get a stock movement by id' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stock.findOne(id, user.companyId!);
  }

  @Get('by-product/:productId')
  @ApiOperation({ summary: 'Get total stock and entries by product' })
  getStockByProduct(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.stock.getStockByProduct(productId, user.companyId!);
  }
}

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
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Record a stock movement (all authenticated roles)' })
  @ApiResponse({ status: 201 })
  createMovement(
    @Body() dto: CreateMovementDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.stock.createMovement(dto, req.user.sub);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List stock movements with filters and pagination' })
  findAll(@Query() query: MovementQueryDto) {
    return this.stock.findAll(query);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get a stock movement by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stock.findOne(id);
  }
}

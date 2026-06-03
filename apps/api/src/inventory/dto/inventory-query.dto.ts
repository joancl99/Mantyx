import { ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryCountStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class InventoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: InventoryCountStatus })
  @IsOptional()
  @IsEnum(InventoryCountStatus)
  status?: InventoryCountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

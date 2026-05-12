import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: MovementType, description: 'INBOUND +qty | OUTBOUND -qty | ADJUSTMENT sets absolute stock' })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({
    example: 50,
    description: 'Units to add/remove. For ADJUSTMENT: target absolute stock value.',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Received from supplier ABC' })
  @IsOptional()
  @IsString()
  notes?: string;
}

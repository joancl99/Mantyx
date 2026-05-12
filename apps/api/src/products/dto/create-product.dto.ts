import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Keyboard' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'WKB-001' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({ example: 'Compact wireless keyboard with backlight' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://storage/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 49.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 10, description: 'Low-stock alert threshold' })
  @IsInt()
  @Min(0)
  minStock: number;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;
}

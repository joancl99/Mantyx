import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddInventoryLineDto {
  @ApiProperty()
  @IsUUID()
  locationId: string;

  @ApiPropertyOptional({ description: 'Defaults to current stock in the location' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedQty?: number;
}

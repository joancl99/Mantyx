import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateInventoryCountDto {
  @ApiProperty({ example: 'Monthly cycle count' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;
}

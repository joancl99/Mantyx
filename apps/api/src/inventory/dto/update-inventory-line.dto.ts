import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateInventoryLineDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  countedQty: number;
}

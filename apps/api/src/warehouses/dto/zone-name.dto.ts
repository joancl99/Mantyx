import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ZoneNameDto {
  @ApiProperty({ example: 'Zona A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}

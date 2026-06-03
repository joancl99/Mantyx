import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LocationCodeDto {
  @ApiProperty({ example: 'A-01-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;
}

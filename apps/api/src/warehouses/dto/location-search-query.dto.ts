import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LocationSearchQueryDto {
  @ApiProperty({
    example: 'A-01-01',
    description: 'Location code to look up (e.g. from a scanned QR)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;
}

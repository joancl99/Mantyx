import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'B12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  // Initial ADMIN account for the new company (created atomically with it).
  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(2)
  adminName: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword: string;
}

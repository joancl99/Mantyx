import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowNoCompany } from '../auth/decorators/allow-no-company.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@Roles('SUPERADMIN')
@AllowNoCompany()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List all companies (superadmin)' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a company (superadmin)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company info (superadmin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({
    summary: 'Toggle company status ACTIVE/INACTIVE (superadmin)',
  })
  toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleStatus(id);
  }
}

/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { extname } from 'path';
import { CompanyId } from '../auth/decorators/company-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const ALLOWED_TYPES = /\.(jpg|jpeg|png|webp)$/i;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  findAll(@CompanyId() companyId: string, @Query() query: ProductQueryDto) {
    return this.products.findAll(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  findOne(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.findOne(id, companyId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a product (ADMIN, MANAGER)' })
  @ApiResponse({ status: 201 })
  create(@CompanyId() companyId: string, @Body() dto: CreateProductDto) {
    return this.products.create(companyId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a product (ADMIN, MANAGER)' })
  update(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, companyId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product (ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.remove(id, companyId);
  }

  @Patch(':id/image')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Upload product image (ADMIN, MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      // Kept in memory so the content can be validated by magic bytes before
      // anything is written to disk (see ProductsService.uploadImage).
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.test(extname(file.originalname))) {
          return cb(
            new BadRequestException(
              'Only jpg, png and webp images are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(
    @CompanyId() companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.products.uploadImage(id, companyId, file);
  }
}

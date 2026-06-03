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
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const ALLOWED_TYPES = /\.(jpg|jpeg|png|webp)$/i;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const imageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = join(process.cwd(), 'uploads', 'products');
    mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ProductQueryDto) {
    return this.products.findAll(user.companyId!, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.findOne(id, user.companyId!);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a product (ADMIN, MANAGER)' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.products.create(user.companyId!, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a product (ADMIN, MANAGER)' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, user.companyId!, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product (ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.remove(id, user.companyId!);
  }

  @Patch(':id/image')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Upload product image (ADMIN, MANAGER)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageStorage,
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.test(extname(file.originalname))) {
          return cb(new BadRequestException('Only jpg, png and webp images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.products.uploadImage(id, user.companyId!, file);
  }
}

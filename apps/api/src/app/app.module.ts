import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { CompaniesModule } from '../companies/companies.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StockModule } from '../stock/stock.module';
import { UsersModule } from '../users/users.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanyGuard } from '../auth/guards/company.guard';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: 'apps/api/.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 120 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    StockModule,
    UsersModule,
    WarehousesModule,
    CompaniesModule,
    DashboardModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CompanyGuard },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { StockAlertsGateway } from './stock-alerts.gateway';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [StockController],
  providers: [StockService, StockAlertsGateway],
  exports: [StockService],
})
export class StockModule {}

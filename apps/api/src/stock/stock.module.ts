import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StockAlertsGateway } from './stock-alerts.gateway';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  // JwtModule is configured per-call: the gateway verifies handshake tokens
  // with the access secret explicitly (same pattern as AuthModule).
  imports: [JwtModule.register({})],
  controllers: [StockController],
  providers: [StockService, StockAlertsGateway],
  exports: [StockService],
})
export class StockModule {}

import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface LowStockPayload {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/ws',
})
export class StockAlertsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(StockAlertsGateway.name);

  @WebSocketServer()
  private server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitLowStock(payload: LowStockPayload) {
    this.server.emit('low-stock', payload);
    this.logger.warn(
      `Low stock alert — ${payload.sku}: ${payload.stock}/${payload.minStock}`,
    );
  }
}

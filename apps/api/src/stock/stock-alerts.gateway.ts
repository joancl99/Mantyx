import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { denylistKey } from '../auth/token-denylist';
import { JwtPayload } from '../auth/types/jwt-payload.interface';
import { RedisService } from '../redis/redis.service';

export interface LowStockPayload {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
}

/** Socket.io room that scopes realtime events to a single tenant. */
export function companyRoom(companyId: string): string {
  return `company:${companyId}`;
}

// CORS note: the websocket transport carries no cookies and clients must
// present the access token explicitly in the handshake, so authentication —
// not the Origin header — is what gates the data here.
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

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Connections must carry a valid access token in the socket.io handshake
   * (`io(url, { auth: { token } })`). Authenticated clients join their
   * company's room so realtime events never cross tenants; SUPERADMIN
   * (no company) connects but receives no tenant-scoped events.
   */
  async handleConnection(client: Socket) {
    const payload = await this.verifyClient(client);
    if (!payload) {
      client.disconnect(true);
      return;
    }

    if (payload.companyId) {
      await client.join(companyRoom(payload.companyId));
    }
    this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitLowStock(companyId: string, payload: LowStockPayload) {
    this.server.to(companyRoom(companyId)).emit('low-stock', payload);
    this.logger.warn(
      `Low stock alert — ${payload.sku}: ${payload.stock}/${payload.minStock}`,
    );
  }

  private async verifyClient(client: Socket): Promise<JwtPayload | null> {
    const token = (client.handshake.auth as Record<string, unknown> | undefined)
      ?.token;
    if (typeof token !== 'string' || token.length === 0) return null;

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      // Same revocation rule as HTTP requests: a logged-out access token
      // cannot open a socket before its natural expiry.
      if (payload.jti && (await this.redis.get(denylistKey(payload.jti)))) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}

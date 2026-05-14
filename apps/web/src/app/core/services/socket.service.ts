import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  readonly lowStockAlerts$ = new Subject<LowStockAlert>();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${environment.wsUrl}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('low-stock', (alert: LowStockAlert) => {
      this.lowStockAlerts$.next(alert);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

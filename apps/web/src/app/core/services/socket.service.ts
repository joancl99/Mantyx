import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { LowStockAlert } from '../models/alert.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  readonly lowStockAlerts$ = new Subject<LowStockAlert>();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(`${environment.wsUrl}/ws`, {
      // The callback form is re-invoked on every (re)connection, so socket.io
      // always hands the gateway the *current* access token. After a
      // server-side disconnect the reconnect carries a fresh token instead of
      // the stale one captured at the original handshake (which would be
      // rejected once it expired, stranding the realtime alerts).
      auth: (cb: (data: Record<string, unknown>) => void) =>
        cb({ token: this.auth.accessToken() ?? '' }),
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

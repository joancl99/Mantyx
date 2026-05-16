import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DashboardKpis {
  totalProducts: number;
  lowStock: number;
  noStock: number;
  movementsToday: number;
}

export interface DashboardAlert {
  id: string;
  productName: string;
  sku: string;
  totalStock: number;
  minStock: number;
  type: 'low-stock' | 'no-stock';
}

export interface DashboardMovement {
  id: string;
  type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  productName: string;
  warehouseName: string;
  createdAt: string;
}

export interface DashboardStats {
  kpis: DashboardKpis;
  alerts: DashboardAlert[];
  recentMovements: DashboardMovement[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  getStats() {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }
}

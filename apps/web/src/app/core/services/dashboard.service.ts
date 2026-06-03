import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  getStats() {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }
}

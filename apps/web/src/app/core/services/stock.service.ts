import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type MovementType = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  notes: string | null;
  productId: string;
  product: { id: string; name: string; sku: string };
  userId: string;
  createdAt: string;
}

export interface CreateMovementDto {
  productId: string;
  type: MovementType;
  quantity: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly base = `${environment.apiUrl}/stock/movements`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<StockMovement[]>(this.base);
  }

  getOne(id: string) {
    return this.http.get<StockMovement>(`${this.base}/${id}`);
  }

  create(dto: CreateMovementDto) {
    return this.http.post<StockMovement>(this.base, dto);
  }
}

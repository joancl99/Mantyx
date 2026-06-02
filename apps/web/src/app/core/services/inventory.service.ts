import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type InventoryCountStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InventoryCountLine {
  id: string;
  expectedQty: number;
  countedQty: number | null;
  difference: number | null;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    code: string;
    aisle: {
      id: string;
      name: string;
      zone: {
        id: string;
        name: string;
        warehouse: { id: string; name: string };
      };
    };
  };
}

export interface InventoryCount {
  id: string;
  name: string;
  status: InventoryCountStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  warehouseId: string;
  warehouse: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  _count: { lines: number };
  lines?: InventoryCountLine[];
}

export interface InventoryQuery {
  page?: number;
  limit?: number;
  status?: InventoryCountStatus;
  warehouseId?: string;
}

export interface InventoryResponse {
  data: InventoryCount[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInventoryCountDto {
  name: string;
  warehouseId: string;
}

export interface AddInventoryLineDto {
  locationId: string;
  expectedQty?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/inventory`;

  getAll(query: InventoryQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    if (query.status) params = params.set('status', query.status);
    if (query.warehouseId) params = params.set('warehouseId', query.warehouseId);
    return this.http.get<InventoryResponse>(this.base, { params });
  }

  getOne(id: string) {
    return this.http.get<InventoryCount>(`${this.base}/${id}`);
  }

  create(dto: CreateInventoryCountDto) {
    return this.http.post<InventoryCount>(this.base, dto);
  }

  start(id: string) {
    return this.http.patch<InventoryCount>(`${this.base}/${id}/start`, {});
  }

  complete(id: string) {
    return this.http.patch<InventoryCount>(`${this.base}/${id}/complete`, {});
  }

  addLine(id: string, dto: AddInventoryLineDto) {
    return this.http.post<InventoryCountLine>(`${this.base}/${id}/lines`, dto);
  }

  updateLine(id: string, lineId: string, countedQty: number) {
    return this.http.patch<InventoryCountLine>(`${this.base}/${id}/lines/${lineId}`, { countedQty });
  }

  removeLine(id: string, lineId: string) {
    return this.http.delete<{ id: string }>(`${this.base}/${id}/lines/${lineId}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { zones: number };
}

export interface CreateWarehouseDto {
  name: string;
  address?: string;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  private readonly base = `${environment.apiUrl}/warehouses`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Warehouse[]>(this.base);
  }

  create(dto: CreateWarehouseDto) {
    return this.http.post<Warehouse>(this.base, dto);
  }

  update(id: string, dto: Partial<CreateWarehouseDto>) {
    return this.http.patch<Warehouse>(`${this.base}/${id}`, dto);
  }

  toggleActive(id: string) {
    return this.http.patch<Warehouse>(`${this.base}/${id}/toggle-active`, {});
  }
}

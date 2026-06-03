import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Aisle,
  CreateWarehouseDto,
  Location,
  Warehouse,
  Zone,
} from '../models/warehouse.models';

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/warehouses`;

  getAll() { return this.http.get<Warehouse[]>(this.base); }
  create(dto: CreateWarehouseDto) { return this.http.post<Warehouse>(this.base, dto); }
  update(id: string, dto: Partial<CreateWarehouseDto>) { return this.http.patch<Warehouse>(`${this.base}/${id}`, dto); }
  toggleActive(id: string) { return this.http.patch<Warehouse>(`${this.base}/${id}/toggle-active`, {}); }

  // ── Zones ─────────────────────────────────────────────────────────────────────
  getZones(wId: string) { return this.http.get<Zone[]>(`${this.base}/${wId}/zones`); }
  createZone(wId: string, name: string) { return this.http.post<Zone>(`${this.base}/${wId}/zones`, { name }); }
  renameZone(wId: string, zId: string, name: string) { return this.http.patch<Zone>(`${this.base}/${wId}/zones/${zId}`, { name }); }
  deleteZone(wId: string, zId: string) { return this.http.delete<{ id: string }>(`${this.base}/${wId}/zones/${zId}`); }

  // ── Aisles ────────────────────────────────────────────────────────────────────
  getAisles(wId: string, zId: string) { return this.http.get<Aisle[]>(`${this.base}/${wId}/zones/${zId}/aisles`); }
  createAisle(wId: string, zId: string, name: string) { return this.http.post<Aisle>(`${this.base}/${wId}/zones/${zId}/aisles`, { name }); }
  renameAisle(wId: string, zId: string, aId: string, name: string) { return this.http.patch<Aisle>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}`, { name }); }
  deleteAisle(wId: string, zId: string, aId: string) { return this.http.delete<{ id: string }>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}`); }

  // ── Locations ─────────────────────────────────────────────────────────────────
  getLocations(wId: string, zId: string, aId: string) { return this.http.get<Location[]>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}/locations`); }
  createLocation(wId: string, zId: string, aId: string, code: string) { return this.http.post<Location>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}/locations`, { code }); }
  renameLocation(wId: string, zId: string, aId: string, lId: string, code: string) { return this.http.patch<Location>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}/locations/${lId}`, { code }); }
  deleteLocation(wId: string, zId: string, aId: string, lId: string) { return this.http.delete<{ id: string }>(`${this.base}/${wId}/zones/${zId}/aisles/${aId}/locations/${lId}`); }
}

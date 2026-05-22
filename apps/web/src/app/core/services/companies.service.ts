import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  taxId: string | null;
  status: CompanyStatus;
  createdAt: string;
  _count: { users: number; warehouses: number };
}

export interface CreateCompanyDto {
  name: string;
  taxId?: string;
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/companies`;

  getAll() { return this.http.get<CompanyInfo[]>(this.base); }
  create(dto: CreateCompanyDto) { return this.http.post<CompanyInfo>(this.base, dto); }
  update(id: string, dto: Partial<CreateCompanyDto>) { return this.http.patch<CompanyInfo>(`${this.base}/${id}`, dto); }
  toggleStatus(id: string) { return this.http.patch<CompanyInfo>(`${this.base}/${id}/toggle-status`, {}); }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Brand {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/brands`;

  getAll() {
    return this.http.get<Brand[]>(this.base);
  }

  create(name: string) {
    return this.http.post<Brand>(this.base, { name });
  }

  rename(id: string, name: string) {
    return this.http.patch<Brand>(`${this.base}/${id}`, { name });
  }

  delete(id: string) {
    return this.http.delete<{ id: string }>(`${this.base}/${id}`);
  }
}

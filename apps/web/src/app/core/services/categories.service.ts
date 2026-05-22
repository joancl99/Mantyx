import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Category {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  getAll() {
    return this.http.get<Category[]>(this.base);
  }

  create(name: string) {
    return this.http.post<Category>(this.base, { name });
  }

  rename(id: string, name: string) {
    return this.http.patch<Category>(`${this.base}/${id}`, { name });
  }

  delete(id: string) {
    return this.http.delete<{ id: string }>(`${this.base}/${id}`);
  }
}

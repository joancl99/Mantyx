import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Brand {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly base = `${environment.apiUrl}/brands`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Brand[]>(this.base);
  }

  create(name: string) {
    return this.http.post<Brand>(this.base, { name });
  }
}

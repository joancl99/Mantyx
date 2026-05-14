import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsQuery {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  categoryId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly base = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getAll(query: ProductsQuery = {}) {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.lowStock !== undefined) params = params.set('lowStock', String(query.lowStock));
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<PaginatedProducts>(this.base, { params });
  }

  getOne(id: string) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(dto: CreateProductDto) {
    return this.http.post<Product>(this.base, dto);
  }

  update(id: string, dto: Partial<CreateProductDto>) {
    return this.http.patch<Product>(`${this.base}/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

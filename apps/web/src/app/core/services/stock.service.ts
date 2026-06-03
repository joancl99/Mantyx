import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CreateMovementDto,
  MovementQuery,
  MovementsResponse,
  StockByProductResponse,
  StockMovement,
  StockOverviewResponse,
} from '../models/stock.models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly base = `${environment.apiUrl}/stock/movements`;
  private readonly byProduct = `${environment.apiUrl}/stock/by-product`;

  constructor(private http: HttpClient) {}

  getAll(query: MovementQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.type) params = params.set('type', query.type);
    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params = params.set('dateTo', query.dateTo);
    if (query.productId) params = params.set('productId', query.productId);
    return this.http.get<MovementsResponse>(this.base, { params });
  }

  getOne(id: string) {
    return this.http.get<StockMovement>(`${this.base}/${id}`);
  }

  create(dto: CreateMovementDto) {
    return this.http.post<StockMovement>(this.base, dto);
  }

  getOverview(query: { search?: string; lowStock?: boolean; page?: number; limit?: number } = {}) {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.lowStock !== undefined) params = params.set('lowStock', String(query.lowStock));
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    return this.http.get<StockOverviewResponse>(`${environment.apiUrl}/stock/overview`, { params });
  }

  getStockByProduct(productId: string) {
    return this.http.get<StockByProductResponse>(`${this.byProduct}/${productId}`);
  }
}

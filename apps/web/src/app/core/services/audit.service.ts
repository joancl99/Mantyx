import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuditQuery, AuditResponse } from '../models/audit.models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/audit`;

  getAll(query: AuditQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.action) params = params.set('action', query.action);
    if (query.entityType) params = params.set('entityType', query.entityType);
    return this.http.get<AuditResponse>(this.base, { params });
  }
}

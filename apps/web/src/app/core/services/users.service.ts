import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompanyUser, CreateUserDto, UpdateUserDto } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  getAll(): Observable<CompanyUser[]> {
    return this.http.get<CompanyUser[]>(this.base);
  }

  create(dto: CreateUserDto): Observable<CompanyUser> {
    return this.http.post<CompanyUser>(this.base, dto);
  }

  update(id: string, dto: UpdateUserDto): Observable<CompanyUser> {
    return this.http.patch<CompanyUser>(`${this.base}/${id}`, dto);
  }

  toggleActive(id: string): Observable<CompanyUser> {
    return this.http.patch<CompanyUser>(`${this.base}/${id}/toggle`, {});
  }
}

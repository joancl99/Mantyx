import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'wh_access_token';
const REFRESH_TOKEN_KEY = 'wh_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _accessToken = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  private readonly _user = signal<User | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._accessToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this._storeSession(res)));
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password })
      .pipe(tap((res) => this._storeSession(res)));
  }

  refresh() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http
      .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          this._accessToken.set(res.accessToken);
          localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
        }),
        map((res) => res.accessToken)
      );
  }

  logout() {
    return this.http
      .post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  clearSession() {
    this._accessToken.set(null);
    this._user.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.router.navigate(['/auth/login']);
  }

  private _storeSession(res: AuthResponse) {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
  }
}

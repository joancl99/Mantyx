import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, RefreshResponse } from '../models/auth.models';

/**
 * The access token is kept in memory only (never in localStorage), so an XSS
 * payload cannot read it from storage. The refresh token lives in an httpOnly
 * cookie set by the API, so it is invisible to JavaScript entirely. On a full
 * page reload the in-memory access token is lost and restored via the refresh
 * cookie during app bootstrap.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<AuthUser | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._accessToken());

  // Requests that rely on the refresh cookie must send credentials so the
  // browser includes the cookie (also required cross-origin in dev).
  private readonly withCredentials = { withCredentials: true };

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/login`,
        { email, password },
        this.withCredentials,
      )
      .pipe(tap((res) => this._storeSession(res)));
  }

  refresh() {
    return this.http
      .post<RefreshResponse>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        this.withCredentials,
      )
      .pipe(
        tap((res) => {
          this._accessToken.set(res.accessToken);
          this._user.set(this._parseTokenUser(res.accessToken));
        }),
        map((res) => res.accessToken),
      );
  }

  /**
   * Attempts to restore a session from the refresh cookie on app start.
   * Resolves regardless of outcome so the app can boot logged-out.
   */
  bootstrap(): Promise<void> {
    return new Promise((resolve) => {
      this.refresh()
        .pipe(catchError(() => of(null)))
        .subscribe(() => resolve());
    });
  }

  logout() {
    return this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, this.withCredentials)
      .pipe(
        catchError(() => of(null)),
        tap(() => this.clearSession()),
      );
  }

  clearSession() {
    this._accessToken.set(null);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private _storeSession(res: AuthResponse) {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
  }

  private _parseTokenUser(token: string | null): AuthUser | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? '',
        role: payload.role,
        companyId: payload.companyId ?? null,
      };
    } catch {
      return null;
    }
  }
}

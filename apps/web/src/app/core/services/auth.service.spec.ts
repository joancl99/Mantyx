import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService refresh', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shares a single in-flight refresh between concurrent callers', () => {
    const tokens: string[] = [];
    service.refresh().subscribe((t) => tokens.push(t));
    service.refresh().subscribe((t) => tokens.push(t));

    // Both subscriptions must be served by ONE request — a second refresh
    // would present the already-rotated cookie and kill the session.
    const req = http.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush({ accessToken: 'token-1' });

    expect(tokens).toEqual(['token-1', 'token-1']);
    expect(service.accessToken()).toBe('token-1');
  });

  it('starts a fresh request once the previous refresh settled', () => {
    service.refresh().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'token-1',
    });

    service.refresh().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'token-2',
    });

    expect(service.accessToken()).toBe('token-2');
  });

  it('propagates a failed refresh to every concurrent caller and resets', () => {
    const errors: number[] = [];
    service.refresh().subscribe({ error: (e) => errors.push(e.status) });
    service.refresh().subscribe({ error: (e) => errors.push(e.status) });

    http
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toEqual([401, 401]);

    // The shared observable must not cache the failure for later callers.
    service.refresh().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({
      accessToken: 'token-3',
    });
    expect(service.accessToken()).toBe('token-3');
  });
});

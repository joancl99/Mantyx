import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { vi } from 'vitest';
import type { UserRole } from '../models/user.models';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

function routeWithRoles(roles: UserRole[]): ActivatedRouteSnapshot {
  return { data: { roles } } as unknown as ActivatedRouteSnapshot;
}

describe('roleGuard', () => {
  const createUrlTree = vi.fn((commands: string[]) => ({ commands }));
  let currentRole: UserRole | null;

  beforeEach(() => {
    currentRole = null;
    createUrlTree.mockClear();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => (currentRole ? { role: currentRole } : null),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it('allows users with an allowed role', () => {
    currentRole = 'MANAGER';

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        routeWithRoles(['SUPERADMIN', 'ADMIN', 'MANAGER']),
        {} as never,
      ),
    );

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects denied roles to home', () => {
    currentRole = 'VIEWER';

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['SUPERADMIN', 'ADMIN']), {} as never),
    );

    expect(result).toEqual({ commands: ['/app/home'] });
    expect(createUrlTree).toHaveBeenCalledWith(['/app/home']);
  });

  it('redirects missing users to login', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['SUPERADMIN']), {} as never),
    );

    expect(result).toEqual({ commands: ['/auth/login'] });
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});

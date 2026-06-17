import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import type { UserRole } from '../models/user.models';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const role = authService.currentUser()?.role;

  if (!role) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!allowedRoles?.length || allowedRoles.includes(role)) {
    return true;
  }

  return router.createUrlTree(['/app/home']);
};

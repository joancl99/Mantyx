import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppConfigService } from '../core/services/app-config.service';
import { AuthService } from '../core/services/auth.service';
import { firstAvailableModuleId } from './nav-items';

/**
 * Blocks a module's route when the build config disables it (active:false),
 * redirecting to the first module the user can still reach. Pairs with the
 * menu filter so a disabled module is both hidden and unreachable by URL.
 */
export const moduleActiveGuard: CanActivateFn = (route) => {
  const config = inject(AppConfigService);
  const id = route.routeConfig?.path ?? '';
  if (config.isModuleActive(id)) return true;

  const auth = inject(AuthService);
  const fallback = firstAvailableModuleId(auth.currentUser()?.role, (m) =>
    config.isModuleActive(m),
  );
  // All modules disabled (the fallback is this same route) → let it through
  // instead of bouncing forever.
  if (fallback === id) return true;

  return inject(Router).createUrlTree(['/app', fallback]);
};

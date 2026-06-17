import { inject } from '@angular/core';
import { Router, type Route } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
import { AppConfigService } from '../core/services/app-config.service';
import { AuthService } from '../core/services/auth.service';
import { firstAvailableModuleId } from './nav-items';
import { moduleActiveGuard } from './module-active.guard';
import type { UserRole } from '../core/models/user.models';

const ALL_ROLES: UserRole[] = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'VIEWER',
];
const OPERATOR_UP: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];
const MANAGERS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
const ADMINS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN'];

export const shellRoutes: Route[] = [
  {
    path: 'home',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: ALL_ROLES },
    loadComponent: () =>
      import('../features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'products',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/products/products.component').then(
        (m) => m.ProductsComponent,
      ),
  },
  {
    path: 'stock',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: ALL_ROLES },
    loadComponent: () =>
      import('../features/stock/stock.component').then((m) => m.StockComponent),
  },
  {
    path: 'movements',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/movements/movements.component').then(
        (m) => m.MovementsComponent,
      ),
  },
  {
    path: 'inventory',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/inventory/inventory.component').then(
        (m) => m.InventoryComponent,
      ),
  },
  {
    path: 'warehouses',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/warehouses/warehouses.component').then(
        (m) => m.WarehousesComponent,
      ),
  },
  {
    path: 'receptions',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/receptions/receptions.component').then(
        (m) => m.ReceptionsComponent,
      ),
  },
  {
    path: 'expeditions',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/expeditions/expeditions.component').then(
        (m) => m.ExpeditionsComponent,
      ),
  },
  {
    path: 'management',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/management/management.component').then(
        (m) => m.ManagementComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [roleGuard, moduleActiveGuard],
    data: { roles: ADMINS_UP },
    loadComponent: () =>
      import('../features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    // Land on the first module the user can reach (role-allowed + active),
    // since Inicio itself can be disabled by the build config.
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const config = inject(AppConfigService);
      const auth = inject(AuthService);
      const router = inject(Router);
      return router.createUrlTree([
        '/app',
        firstAvailableModuleId(auth.currentUser()?.role, (m) =>
          config.isModuleActive(m),
        ),
      ]);
    },
  },
];

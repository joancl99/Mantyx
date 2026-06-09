import type { Route } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
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
    path: 'dashboard',
    canActivate: [roleGuard],
    data: { roles: ALL_ROLES },
    loadComponent: () =>
      import('../features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'products',
    canActivate: [roleGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/products/products.component').then(
        (m) => m.ProductsComponent,
      ),
  },
  {
    path: 'stock',
    canActivate: [roleGuard],
    data: { roles: ALL_ROLES },
    loadComponent: () =>
      import('../features/stock/stock.component').then((m) => m.StockComponent),
  },
  {
    path: 'movements',
    canActivate: [roleGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/movements/movements.component').then(
        (m) => m.MovementsComponent,
      ),
  },
  {
    path: 'inventory',
    canActivate: [roleGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/inventory/inventory.component').then(
        (m) => m.InventoryComponent,
      ),
  },
  {
    path: 'warehouses',
    canActivate: [roleGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/warehouses/warehouses.component').then(
        (m) => m.WarehousesComponent,
      ),
  },
  {
    path: 'receptions',
    canActivate: [roleGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/receptions/receptions.component').then(
        (m) => m.ReceptionsComponent,
      ),
  },
  {
    path: 'expeditions',
    canActivate: [roleGuard],
    data: { roles: OPERATOR_UP },
    loadComponent: () =>
      import('../features/expeditions/expeditions.component').then(
        (m) => m.ExpeditionsComponent,
      ),
  },
  {
    path: 'management',
    canActivate: [roleGuard],
    data: { roles: MANAGERS_UP },
    loadComponent: () =>
      import('../features/management/management.component').then(
        (m) => m.ManagementComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: ADMINS_UP },
    loadComponent: () =>
      import('../features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

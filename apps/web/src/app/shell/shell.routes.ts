import { Route } from '@angular/router';

export const shellRoutes: Route[] = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('../features/products/products.component').then(
        (m) => m.ProductsComponent,
      ),
  },
  {
    path: 'stock',
    loadComponent: () =>
      import('../features/stock/stock.component').then((m) => m.StockComponent),
  },
  {
    path: 'movements',
    loadComponent: () =>
      import('../features/movements/movements.component').then(
        (m) => m.MovementsComponent,
      ),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('../features/inventory/inventory.component').then(
        (m) => m.InventoryComponent,
      ),
  },
  {
    path: 'warehouses',
    loadComponent: () =>
      import('../features/warehouses/warehouses.component').then(
        (m) => m.WarehousesComponent,
      ),
  },
  {
    path: 'management',
    loadComponent: () =>
      import('../features/management/management.component').then(
        (m) => m.ManagementComponent,
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('../features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

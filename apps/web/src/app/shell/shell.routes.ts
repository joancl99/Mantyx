import { Route } from '@angular/router';

export const shellRoutes: Route[] = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'stock-query',
    loadComponent: () =>
      import('../features/stock-query/stock-query.component').then(
        (m) => m.StockQueryComponent
      ),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('../features/inventory/inventory.component').then(
        (m) => m.InventoryComponent
      ),
  },
  {
    path: 'inventory/:id',
    loadComponent: () =>
      import('../features/inventory/product-detail/product-detail.component').then(
        (m) => m.ProductDetailComponent
      ),
  },
  {
    path: 'receptions',
    loadComponent: () =>
      import('../features/receptions/receptions.component').then(
        (m) => m.ReceptionsComponent
      ),
  },
  {
    path: 'expeditions',
    loadComponent: () =>
      import('../features/expeditions/expeditions.component').then(
        (m) => m.ExpeditionsComponent
      ),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

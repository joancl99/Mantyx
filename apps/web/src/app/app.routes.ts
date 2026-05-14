import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./auth/register/register.component').then(
            (m) => m.RegisterComponent
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    children: [
      {
        path: 'products',
        loadComponent: () =>
          import('./products/products-list/products-list.component').then(
            (m) => m.ProductsListComponent
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./products/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent
          ),
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('./stock/stock-movement/stock-movement.component').then(
            (m) => m.StockMovementComponent
          ),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/auth/login' },
];

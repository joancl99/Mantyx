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
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    loadChildren: () =>
      import('./shell/shell.routes').then((m) => m.shellRoutes),
  },
  { path: '**', redirectTo: '/auth/login' },
];

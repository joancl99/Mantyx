import { Component, computed, inject } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonMenu,
  IonContent,
  IonIcon,
  IonRouterOutlet,
  IonMenuToggle,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  cubeOutline,
  layersOutline,
  swapHorizontalOutline,
  clipboardOutline,
  businessOutline,
  barChartOutline,
  settingsOutline,
  logOutOutline,
  cubeSharp,
  barcodeOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { Role } from '../core/services/auth.service';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'VIEWER',
];
const MANAGERS_UP: Role[] = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
const ADMINS_UP: Role[] = ['SUPERADMIN', 'ADMIN'];

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: 'home-outline',
    route: '/app/dashboard',
    roles: ALL_ROLES,
  },
  {
    label: 'Productos',
    icon: 'cube-outline',
    route: '/app/products',
    roles: MANAGERS_UP,
  },
  {
    label: 'Stock',
    icon: 'layers-outline',
    route: '/app/stock',
    roles: ALL_ROLES,
  },
  {
    label: 'Movimientos',
    icon: 'swap-horizontal-outline',
    route: '/app/movements',
    roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'],
  },
  {
    label: 'Inventario',
    icon: 'clipboard-outline',
    route: '/app/inventory',
    roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'],
  },
  {
    label: 'Almacenes',
    icon: 'business-outline',
    route: '/app/warehouses',
    roles: MANAGERS_UP,
  },
  {
    label: 'Management',
    icon: 'bar-chart-outline',
    route: '/app/management',
    roles: MANAGERS_UP,
  },
  {
    label: 'Administración',
    icon: 'settings-outline',
    route: '/app/admin',
    roles: ADMINS_UP,
  },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    LowerCasePipe,
    RouterLink,
    RouterLinkActive,
    IonMenu,
    IonContent,
    IonIcon,
    IonRouterOutlet,
    IonMenuToggle,
    IonFab,
    IonFabButton,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  readonly navItems = computed(() => {
    const role = this.currentUser()?.role;
    if (!role) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(role));
  });

  constructor() {
    addIcons({
      homeOutline,
      cubeOutline,
      layersOutline,
      swapHorizontalOutline,
      clipboardOutline,
      businessOutline,
      barChartOutline,
      settingsOutline,
      logOutOutline,
      cubeSharp,
      barcodeOutline,
      shieldCheckmarkOutline,
    });
  }

  logout() {
    this.authService.logout().subscribe();
  }

  openScanner() {
    // Scanner global — se implementará cuando integremos Capacitor BarcodeScanner
  }
}

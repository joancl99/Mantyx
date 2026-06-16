import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LowerCasePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonMenu,
  IonContent,
  IonIcon,
  IonRouterOutlet,
  IonMenuToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  cubeOutline,
  analyticsOutline,
  swapHorizontalOutline,
  clipboardOutline,
  businessOutline,
  barChartOutline,
  settingsOutline,
  logOutOutline,
  shieldCheckmarkOutline,
  downloadOutline,
  sendOutline,
  warningOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { ScannerService } from '../core/services/scanner.service';
import { SocketService } from '../core/services/socket.service';
import { ScannerOverlayComponent } from '../core/scanner/scanner-overlay.component';
import { UserRole } from '../core/models/user.models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'VIEWER',
];
const MANAGERS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
const ADMINS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN'];

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Inicio',
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
    icon: 'analytics-outline',
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
    label: 'Recepciones',
    icon: 'download-outline',
    route: '/app/receptions',
    roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'],
  },
  {
    label: 'Expediciones',
    icon: 'send-outline',
    route: '/app/expeditions',
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LowerCasePipe,
    RouterLink,
    RouterLinkActive,
    IonMenu,
    IonContent,
    IonIcon,
    IonRouterOutlet,
    IonMenuToggle,
    ScannerOverlayComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);
  readonly scannerService = inject(ScannerService);
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
      analyticsOutline,
      swapHorizontalOutline,
      clipboardOutline,
      businessOutline,
      barChartOutline,
      settingsOutline,
      logOutOutline,
      shieldCheckmarkOutline,
      downloadOutline,
      sendOutline,
      warningOutline,
    });
  }

  ngOnInit() {
    if (this.authService.accessToken()) this.socketService.connect();

    this.socketService.lowStockAlerts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => this.showLowStockToast(alert));
  }

  private async showLowStockToast(alert: {
    name: string;
    sku: string;
    stock: number;
    minStock: number;
  }) {
    const toast = await this.toastCtrl.create({
      message: `Stock bajo: ${alert.name} (${alert.sku}) — ${alert.stock}/${alert.minStock}`,
      duration: 5000,
      position: 'top',
      color: 'warning',
      icon: 'warning-outline',
      buttons: [{ role: 'cancel', text: '✕' }],
    });
    await toast.present();
  }

  logout() {
    this.socketService.disconnect();
    this.authService.logout().subscribe();
  }
}

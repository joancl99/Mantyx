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
import { AppConfigService } from '../core/services/app-config.service';
import { ScannerOverlayComponent } from '../core/scanner/scanner-overlay.component';
import { NAV_ITEMS } from './nav-items';

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
  private readonly appConfig = inject(AppConfigService);
  readonly scannerService = inject(ScannerService);
  readonly currentUser = this.authService.currentUser;

  readonly navItems = computed(() => {
    const role = this.currentUser()?.role;
    if (!role) return [];
    // Visible when the role allows it AND the build config keeps it active.
    return NAV_ITEMS.filter(
      (item) =>
        item.roles.includes(role) && this.appConfig.isModuleActive(item.id),
    );
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

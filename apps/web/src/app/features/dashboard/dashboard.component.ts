import { Component, computed, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonContent, IonIcon, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline, warningOutline, closeCircleOutline, swapHorizontalOutline,
  arrowUpOutline, arrowDownOutline, layersOutline, addCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardAlert, DashboardMovement } from '../../core/services/dashboard.service';

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  accent: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Ver stock',        icon: 'layers-outline',     route: '/app/stock',     accent: false },
  { label: 'Nuevo movimiento', icon: 'add-circle-outline', route: '/app/movements', accent: true  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonContent, IonIcon, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonSpinner, RouterLink],
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly totalProducts = signal(0);
  readonly lowStock = signal(0);
  readonly noStock = signal(0);
  readonly movementsToday = signal(0);
  readonly alerts = signal<DashboardAlert[]>([]);
  readonly movements = signal<DashboardMovement[]>([]);

  readonly quickActions = QUICK_ACTIONS;

  readonly greeting = computed(() => {
    const name = this.auth.currentUser()?.name?.split(' ')[0] ?? 'usuario';
    const hour = new Date().getHours();
    const saludo = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    return `${saludo}, ${name}`;
  });

  constructor() {
    addIcons({
      cubeOutline, warningOutline, closeCircleOutline, swapHorizontalOutline,
      arrowUpOutline, arrowDownOutline, layersOutline, addCircleOutline,
    });
  }

  ngOnInit() {
    this.dashboardService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.totalProducts.set(stats.kpis.totalProducts);
          this.lowStock.set(stats.kpis.lowStock);
          this.noStock.set(stats.kpis.noStock);
          this.movementsToday.set(stats.kpis.movementsToday);
          this.alerts.set(stats.alerts);
          this.movements.set(stats.recentMovements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  movementIcon(type: DashboardMovement['type']): string {
    return type === 'INBOUND' ? 'arrow-up-outline'
      : type === 'OUTBOUND' ? 'arrow-down-outline'
      : 'swap-horizontal-outline';
  }

  movementKind(type: DashboardMovement['type']): string {
    return type === 'INBOUND' ? 'entrada' : type === 'OUTBOUND' ? 'salida' : 'traslado';
  }

  movementPrefix(type: DashboardMovement['type']): string {
    return type === 'INBOUND' ? '+' : type === 'OUTBOUND' ? '−' : '↔ ';
  }

  alertType(type: DashboardAlert['type']): string {
    return type === 'no-stock' ? 'sin-stock' : 'stock-bajo';
  }

  alertLabel(type: DashboardAlert['type']): string {
    return type === 'no-stock' ? 'Sin stock' : 'Stock bajo';
  }

  alertText(alert: DashboardAlert): string {
    return alert.type === 'no-stock'
      ? `${alert.productName} — sin stock`
      : `${alert.productName} — stock bajo (${alert.totalStock} uds, mín. ${alert.minStock})`;
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }
}

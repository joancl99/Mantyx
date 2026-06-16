import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonContent,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonTitle,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  warningOutline,
  closeCircleOutline,
  swapHorizontalOutline,
  arrowUpOutline,
  arrowDownOutline,
  barcodeOutline,
} from 'ionicons/icons';
import {
  DashboardAlert,
  DashboardMovement,
} from '../../core/models/dashboard.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { ScannerService } from '../../core/services/scanner.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonTitle,
    IonSpinner,
  ],
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  readonly scanner = inject(ScannerService);

  readonly loading = signal(true);
  readonly totalProducts = signal(0);
  readonly lowStock = signal(0);
  readonly noStock = signal(0);
  readonly movementsToday = signal(0);
  readonly alerts = signal<DashboardAlert[]>([]);
  readonly movements = signal<DashboardMovement[]>([]);
  readonly warehouseCount = signal(0);

  // Tenant data spans every warehouse, so the subtitle only says "todos los
  // almacenes" when there is actually more than one.
  readonly summaryLabel = computed(() =>
    this.warehouseCount() > 1
      ? 'Resumen de todos los almacenes'
      : 'Resumen general',
  );

  constructor() {
    addIcons({
      cubeOutline,
      warningOutline,
      closeCircleOutline,
      swapHorizontalOutline,
      arrowUpOutline,
      arrowDownOutline,
      barcodeOutline,
    });
  }

  ngOnInit() {
    this.dashboardService
      .getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.totalProducts.set(stats.kpis.totalProducts);
          this.lowStock.set(stats.kpis.lowStock);
          this.noStock.set(stats.kpis.noStock);
          this.movementsToday.set(stats.kpis.movementsToday);
          this.alerts.set(stats.alerts);
          this.movements.set(stats.recentMovements);
          this.warehouseCount.set(stats.warehouseCount);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  movementIcon(type: DashboardMovement['type']): string {
    return type === 'INBOUND'
      ? 'arrow-up-outline'
      : type === 'OUTBOUND'
        ? 'arrow-down-outline'
        : 'swap-horizontal-outline';
  }

  movementKind(type: DashboardMovement['type']): string {
    return type === 'INBOUND'
      ? 'entrada'
      : type === 'OUTBOUND'
        ? 'salida'
        : 'traslado';
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
    // The status word lives in the badge; the line only carries the product
    // name plus (for low stock) the useful quantity vs. minimum.
    return alert.type === 'no-stock'
      ? alert.productName
      : `${alert.productName} (${alert.totalStock} uds, mín. ${alert.minStock})`;
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

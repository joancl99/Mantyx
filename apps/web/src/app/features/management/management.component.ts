import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  analyticsOutline,
  arrowForwardOutline,
  barChartOutline,
  checkboxOutline,
  clipboardOutline,
  cubeOutline,
  layersOutline,
  refreshOutline,
  swapHorizontalOutline,
  warningOutline,
} from 'ionicons/icons';
import { DashboardStats } from '../../core/models/dashboard.models';
import { StockOverviewItem } from '../../core/models/stock.models';
import { DashboardService } from '../../core/services/dashboard.service';
import { StockService } from '../../core/services/stock.service';

interface ManagementAction {
  label: string;
  description: string;
  route: string;
  icon: string;
  tone: 'primary' | 'warning' | 'neutral';
}

@Component({
  selector: 'app-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
})
export class ManagementComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly dashboard = signal<DashboardStats | null>(null);
  readonly lowStockItems = signal<StockOverviewItem[]>([]);

  readonly riskScore = computed(() => {
    const stats = this.dashboard();
    if (!stats?.kpis.totalProducts) return 0;
    return Math.min(
      100,
      Math.round(
        ((stats.kpis.lowStock + stats.kpis.noStock * 2) / stats.kpis.totalProducts) * 100,
      ),
    );
  });

  readonly healthLabel = computed(() => {
    const score = this.riskScore();
    if (score >= 40) return 'Crítico';
    if (score >= 18) return 'Requiere atención';
    return 'Operación estable';
  });

  readonly healthTone = computed(() => {
    const score = this.riskScore();
    if (score >= 40) return 'danger';
    if (score >= 18) return 'warning';
    return 'success';
  });

  readonly replenishmentUnits = computed(() =>
    this.lowStockItems().reduce(
      (total, item) => total + Math.max(item.minStock - item.totalStock, 0),
      0,
    ),
  );

  readonly topRisks = computed(() =>
    [...this.lowStockItems()]
      .sort((a, b) => this.shortageUnits(b) - this.shortageUnits(a))
      .slice(0, 5),
  );

  readonly actions: ManagementAction[] = [
    {
      label: 'Revisar stock bajo',
      description: 'Prioriza reposiciones por criticidad.',
      route: '/app/stock',
      icon: 'warning-outline',
      tone: 'warning',
    },
    {
      label: 'Registrar movimiento',
      description: 'Entrada, salida, traslado o ajuste.',
      route: '/app/movements',
      icon: 'swap-horizontal-outline',
      tone: 'primary',
    },
    {
      label: 'Lanzar inventario',
      description: 'Crea conteos por almacén.',
      route: '/app/inventory',
      icon: 'clipboard-outline',
      tone: 'neutral',
    },
  ];

  constructor() {
    addIcons({
      alertCircleOutline,
      analyticsOutline,
      arrowForwardOutline,
      barChartOutline,
      checkboxOutline,
      clipboardOutline,
      cubeOutline,
      layersOutline,
      refreshOutline,
      swapHorizontalOutline,
      warningOutline,
    });
  }

  ngOnInit() {
    this.loadManagementData();
  }

  loadManagementData() {
    this.loading.set(true);
    forkJoin({
      dashboard: this.dashboardService.getStats(),
      lowStock: this.stockService.getOverview({ lowStock: true, limit: 8 }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, lowStock }) => {
          this.dashboard.set(dashboard);
          this.lowStockItems.set(lowStock.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  shortageUnits(item: StockOverviewItem): number {
    return Math.max(item.minStock - item.totalStock, 0);
  }

  movementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      INBOUND: 'Entrada',
      OUTBOUND: 'Salida',
      TRANSFER: 'Traslado',
      ADJUSTMENT: 'Ajuste',
      RETURN: 'Devolución',
    };
    return labels[type] ?? type;
  }
}

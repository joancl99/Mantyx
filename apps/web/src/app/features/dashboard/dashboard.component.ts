import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface KpiCard {
  label: string;
  value: number | string;
  icon: string;
  accent: 'default' | 'warning' | 'danger' | 'success';
}

interface Alert {
  id: string;
  text: string;
  type: 'stock-bajo' | 'sin-stock' | 'recuento';
  critical: boolean;
}

interface Movement {
  id: string;
  kind: 'entrada' | 'salida' | 'traslado';
  quantity: number;
  product: string;
  location: string;
  timeAgo: string;
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  accent: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_KPIS: KpiCard[] = [
  { label: 'Productos totales', value: 245,  icon: 'cube-outline',             accent: 'default' },
  { label: 'Stock bajo',        value: 12,   icon: 'warning-outline',          accent: 'warning' },
  { label: 'Sin stock',         value: 4,    icon: 'close-circle-outline',     accent: 'danger'  },
  { label: 'Movimientos hoy',   value: 38,   icon: 'swap-horizontal-outline',  accent: 'success' },
];

const MOCK_ALERTS: Alert[] = [
  { id: '1', text: 'Nike Air Basic 42 — stock bajo (2 uds)',        type: 'stock-bajo', critical: true  },
  { id: '2', text: 'Adidas Runner Blanca 41 — sin stock',           type: 'sin-stock',  critical: true  },
  { id: '3', text: 'Puma Speed Negro 40 — stock bajo (1 ud)',       type: 'stock-bajo', critical: false },
  { id: '4', text: 'Ubicación A1-03-B — pendiente de recuento',     type: 'recuento',   critical: false },
  { id: '5', text: 'Reebok Classic Blanca 39 — sin stock',          type: 'sin-stock',  critical: true  },
];

const MOCK_MOVEMENTS: Movement[] = [
  { id: '1', kind: 'entrada',  quantity: 20, product: 'Nike Air Basic Negro 42',   location: 'A1-03-B', timeAgo: 'hace 10 min' },
  { id: '2', kind: 'salida',   quantity: 3,  product: 'Adidas Runner Blanca 41',   location: 'A2-01-A', timeAgo: 'hace 25 min' },
  { id: '3', kind: 'traslado', quantity: 5,  product: 'Sudadera Basic Gris M',     location: 'B3-02-C', timeAgo: 'hace 1 h'    },
  { id: '4', kind: 'entrada',  quantity: 50, product: 'Camiseta Slim Fit Blanca L', location: 'A1-01-A', timeAgo: 'hace 2 h'   },
  { id: '5', kind: 'salida',   quantity: 8,  product: 'Puma Speed Negro 40',       location: 'C1-04-D', timeAgo: 'hace 3 h'   },
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Escanear',         icon: 'barcode-outline',       route: '/app/scanner',   accent: true  },
  { label: 'Ver stock',        icon: 'layers-outline',        route: '/app/stock',     accent: false },
  { label: 'Nuevo movimiento', icon: 'add-circle-outline',    route: '/app/movements', accent: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonContent, IonIcon, RouterLink],
  styleUrl: './dashboard.component.scss',
  template: `
    <ion-content [scrollY]="true" [fullscreen]="true">
      <div class="dashboard">

        <!-- Header -->
        <header class="dash-header">
          <div class="dash-header__eyebrow">
            <span class="dash-header__dot"></span>
            Sistema activo
          </div>
          <h1 class="dash-header__greeting">{{ greeting() }}</h1>
          <p class="dash-header__sub">Resumen del almacén central</p>
        </header>

        <!-- KPIs -->
        <section class="kpi-grid">
          @for (kpi of kpis; track kpi.label) {
            <div class="kpi-card kpi-card--{{ kpi.accent }}">
              <div class="kpi-card__icon-wrap">
                <ion-icon [name]="kpi.icon"></ion-icon>
              </div>
              <span class="kpi-card__value">{{ kpi.value }}</span>
              <span class="kpi-card__label">{{ kpi.label }}</span>
            </div>
          }
        </section>

        <!-- Alertas -->
        <section class="dash-section">
          <div class="dash-section__header">
            <h2 class="dash-section__title">Alertas importantes</h2>
            <span class="dash-section__count">{{ alerts.length }}</span>
          </div>
          <div class="alert-list">
            @for (alert of alerts; track alert.id) {
              <div class="alert-item">
                <span class="alert-item__dot alert-item__dot--{{ alert.type }}" [class.alert-item__dot--pulse]="alert.critical"></span>
                <span class="alert-item__text">{{ alert.text }}</span>
                <span class="alert-item__badge alert-item__badge--{{ alert.type }}">
                  {{ alertLabel(alert.type) }}
                </span>
              </div>
            }
          </div>
        </section>

        <!-- Últimos movimientos -->
        <section class="dash-section">
          <div class="dash-section__header">
            <h2 class="dash-section__title">Últimos movimientos</h2>
          </div>
          <div class="movement-list">
            @for (mv of movements; track mv.id) {
              <div class="movement-item">
                <div class="movement-item__icon movement-item__icon--{{ mv.kind }}">
                  <ion-icon [name]="movementIcon(mv.kind)"></ion-icon>
                </div>
                <div class="movement-item__body">
                  <span class="movement-item__product">{{ mv.product }}</span>
                  <span class="movement-item__meta">{{ mv.location }}</span>
                </div>
                <div class="movement-item__right">
                  <span class="movement-item__qty movement-item__qty--{{ mv.kind }}">
                    {{ movementPrefix(mv.kind) }}{{ mv.quantity }}
                  </span>
                  <span class="movement-item__time">{{ mv.timeAgo }}</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Accesos rápidos -->
        <section class="dash-section dash-section--last">
          <h2 class="dash-section__title">Accesos rápidos</h2>
          <div class="quick-actions">
            @for (action of quickActions; track action.label) {
              <a
                class="action-btn"
                [class.action-btn--accent]="action.accent"
                [routerLink]="action.route"
                ion-ripple-effect
              >
                <ion-icon [name]="action.icon"></ion-icon>
                <span>{{ action.label }}</span>
              </a>
            }
          </div>
        </section>

      </div>
    </ion-content>
  `,
})
export class DashboardComponent {
  private auth = inject(AuthService);

  readonly kpis = MOCK_KPIS;
  readonly alerts = MOCK_ALERTS;
  readonly movements = MOCK_MOVEMENTS;
  readonly quickActions = QUICK_ACTIONS;

  readonly greeting = computed(() => {
    const name = this.auth.currentUser()?.name?.split(' ')[0] ?? 'usuario';
    const hour = new Date().getHours();
    const saludo = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    return `${saludo}, ${name}`;
  });

  movementIcon(kind: Movement['kind']): string {
    return { entrada: 'arrow-up-outline', salida: 'arrow-down-outline', traslado: 'swap-horizontal-outline' }[kind];
  }

  movementPrefix(kind: Movement['kind']): string {
    return { entrada: '+', salida: '−', traslado: '↔ ' }[kind];
  }

  alertLabel(type: Alert['type']): string {
    return { 'stock-bajo': 'Stock bajo', 'sin-stock': 'Sin stock', 'recuento': 'Recuento' }[type];
  }
}

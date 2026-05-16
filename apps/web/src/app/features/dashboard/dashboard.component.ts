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
  templateUrl: './dashboard.component.html',
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

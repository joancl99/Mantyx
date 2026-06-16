import type { UserRole } from '../core/models/user.models';

export interface NavItem {
  /** Module id — matches the route segment and the app-config.json key. */
  id: string;
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
const OPERATOR_UP: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];
const MANAGERS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
const ADMINS_UP: UserRole[] = ['SUPERADMIN', 'ADMIN'];

// Approved menu order. Shared by the shell menu, the module-active guard and
// the landing-route helper so the three stay in sync.
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Inicio',
    icon: 'home-outline',
    route: '/app/dashboard',
    roles: ALL_ROLES,
  },
  {
    id: 'products',
    label: 'Productos',
    icon: 'cube-outline',
    route: '/app/products',
    roles: MANAGERS_UP,
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: 'analytics-outline',
    route: '/app/stock',
    roles: ALL_ROLES,
  },
  {
    id: 'movements',
    label: 'Movimientos',
    icon: 'swap-horizontal-outline',
    route: '/app/movements',
    roles: OPERATOR_UP,
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: 'clipboard-outline',
    route: '/app/inventory',
    roles: OPERATOR_UP,
  },
  {
    id: 'receptions',
    label: 'Recepciones',
    icon: 'download-outline',
    route: '/app/receptions',
    roles: OPERATOR_UP,
  },
  {
    id: 'expeditions',
    label: 'Expediciones',
    icon: 'send-outline',
    route: '/app/expeditions',
    roles: OPERATOR_UP,
  },
  {
    id: 'warehouses',
    label: 'Almacenes',
    icon: 'business-outline',
    route: '/app/warehouses',
    roles: MANAGERS_UP,
  },
  {
    id: 'management',
    label: 'Management',
    icon: 'bar-chart-outline',
    route: '/app/management',
    roles: MANAGERS_UP,
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: 'settings-outline',
    route: '/app/admin',
    roles: ADMINS_UP,
  },
];

/**
 * First module the user can land on: role-allowed AND active, in menu order.
 * Since every module (Inicio included) can be disabled, this drives both the
 * `/app` landing redirect and the guard fallback. Falls back to the first
 * role-allowed module ignoring `active` so an all-disabled config can't brick
 * navigation. Returns the module id (route segment).
 */
export function firstAvailableModuleId(
  role: UserRole | undefined,
  isActive: (id: string) => boolean,
): string {
  if (role) {
    const active = NAV_ITEMS.find(
      (i) => i.roles.includes(role) && isActive(i.id),
    );
    if (active) return active.id;
    const allowed = NAV_ITEMS.find((i) => i.roles.includes(role));
    if (allowed) return allowed.id;
  }
  return 'dashboard';
}

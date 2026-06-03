import { MovementType } from './stock.models';

export interface DashboardKpis {
  totalProducts: number;
  lowStock: number;
  noStock: number;
  movementsToday: number;
}

export interface DashboardAlert {
  id: string;
  productName: string;
  sku: string;
  totalStock: number;
  minStock: number;
  type: 'low-stock' | 'no-stock';
}

export interface DashboardMovement {
  id: string;
  type: MovementType;
  quantity: number;
  productName: string;
  warehouseName: string;
  createdAt: string;
}

export interface DashboardStats {
  kpis: DashboardKpis;
  alerts: DashboardAlert[];
  recentMovements: DashboardMovement[];
}

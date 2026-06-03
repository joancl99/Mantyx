export type MovementType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'RETURN';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes: string | null;
  productId: string;
  product: { id: string; name: string; sku: string };
  userId: string;
  user: { id: string; name: string; email: string };
  warehouseId: string;
  warehouse: { id: string; name: string };
  createdAt: string;
}

export interface CreateMovementDto {
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  notes?: string;
}

export interface MovementQuery {
  page?: number;
  limit?: number;
  type?: MovementType;
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}

export interface MovementsResponse {
  data: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

export interface StockOverviewItem {
  productId: string;
  name: string;
  sku: string;
  minStock: number;
  totalStock: number;
}

export interface StockOverviewResponse {
  data: StockOverviewItem[];
  total: number;
  page: number;
  limit: number;
}

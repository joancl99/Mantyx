export type InventoryCountStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InventoryCountLine {
  id: string;
  expectedQty: number;
  countedQty: number | null;
  difference: number | null;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    code: string;
    aisle: {
      id: string;
      name: string;
      zone: {
        id: string;
        name: string;
        warehouse: { id: string; name: string };
      };
    };
  };
}

export interface InventoryCount {
  id: string;
  name: string;
  status: InventoryCountStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  warehouseId: string;
  warehouse: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  _count: { lines: number };
  lines?: InventoryCountLine[];
}

export interface InventoryQuery {
  page?: number;
  limit?: number;
  status?: InventoryCountStatus;
  warehouseId?: string;
}

export interface InventoryResponse {
  data: InventoryCount[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateInventoryCountDto {
  name: string;
  warehouseId: string;
}

export interface AddInventoryLineDto {
  locationId: string;
  expectedQty?: number;
}

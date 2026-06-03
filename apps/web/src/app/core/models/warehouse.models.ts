export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { zones: number };
}

export interface Zone {
  id: string;
  name: string;
  _count: { aisles: number };
}

export interface Aisle {
  id: string;
  name: string;
  _count: { locations: number };
}

export interface Location {
  id: string;
  code: string;
  _count: { stockEntries: number };
}

export interface CreateWarehouseDto {
  name: string;
  address?: string;
}

export type WarehouseSubLevel = 'zone' | 'aisle' | 'location';

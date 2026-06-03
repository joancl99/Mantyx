import { computed, signal } from '@angular/core';
import { Aisle, Warehouse, Zone } from '../../core/models/warehouse.models';

export type WarehouseView = 'warehouses' | 'zones' | 'aisles' | 'locations';
export type WarehouseBreadcrumbTarget = 'warehouses' | 'zones' | 'aisles';

export class WarehouseNavigationState {
  readonly selectedWarehouse = signal<Warehouse | null>(null);
  readonly selectedZone = signal<Zone | null>(null);
  readonly selectedAisle = signal<Aisle | null>(null);

  readonly currentView = computed<WarehouseView>(() => {
    if (this.selectedAisle()) return 'locations';
    if (this.selectedZone()) return 'aisles';
    if (this.selectedWarehouse()) return 'zones';
    return 'warehouses';
  });

  enterWarehouse(warehouse: Warehouse) {
    this.selectedWarehouse.set(warehouse);
    this.selectedZone.set(null);
    this.selectedAisle.set(null);
  }

  enterZone(zone: Zone) {
    this.selectedZone.set(zone);
    this.selectedAisle.set(null);
  }

  enterAisle(aisle: Aisle) {
    this.selectedAisle.set(aisle);
  }

  goBack() {
    if (this.selectedAisle()) {
      this.selectedAisle.set(null);
    } else if (this.selectedZone()) {
      this.selectedZone.set(null);
    } else {
      this.selectedWarehouse.set(null);
    }
  }

  goToLevel(target: WarehouseBreadcrumbTarget) {
    if (target === 'warehouses') {
      this.selectedWarehouse.set(null);
      this.selectedZone.set(null);
      this.selectedAisle.set(null);
    } else if (target === 'zones') {
      this.selectedZone.set(null);
      this.selectedAisle.set(null);
    } else {
      this.selectedAisle.set(null);
    }
  }
}

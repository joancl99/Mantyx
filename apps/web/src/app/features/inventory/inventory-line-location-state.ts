import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Aisle, Location, Zone } from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { AddInventoryLineDto } from './models/inventory.models';

export class InventoryLineLocationState {
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly form = new FormGroup({
    zoneId: new FormControl('', Validators.required),
    aisleId: new FormControl('', Validators.required),
    locationId: new FormControl('', Validators.required),
    expectedQty: new FormControl<number | null>(null, Validators.min(0)),
  });

  private warehouseId = '';

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly destroyRef: DestroyRef,
  ) {}

  resetForWarehouse(warehouseId: string) {
    this.warehouseId = warehouseId;
    this.form.reset({
      zoneId: '',
      aisleId: '',
      locationId: '',
      expectedQty: null,
    });
    this.aisles.set([]);
    this.locations.set([]);
    this.loadZones();
  }

  onZoneChange(zoneId: string) {
    this.form.patchValue({ zoneId, aisleId: '', locationId: '' });
    this.aisles.set([]);
    this.locations.set([]);
    if (zoneId) this.loadAisles(zoneId);
  }

  onAisleChange(aisleId: string) {
    this.form.patchValue({ aisleId, locationId: '' });
    this.locations.set([]);

    const zoneId = this.form.controls.zoneId.value;
    if (zoneId && aisleId) this.loadLocations(zoneId, aisleId);
  }

  toDto(): AddInventoryLineDto {
    const raw = this.form.getRawValue();
    return {
      locationId: raw.locationId!,
      expectedQty: raw.expectedQty === null ? undefined : Number(raw.expectedQty),
    };
  }

  private loadZones() {
    this.warehousesService
      .getZones(this.warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((zones) => this.zones.set(zones));
  }

  private loadAisles(zoneId: string) {
    this.warehousesService
      .getAisles(this.warehouseId, zoneId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((aisles) => this.aisles.set(aisles));
  }

  private loadLocations(zoneId: string, aisleId: string) {
    this.warehousesService
      .getLocations(this.warehouseId, zoneId, aisleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locations) => this.locations.set(locations));
  }
}

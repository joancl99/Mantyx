import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { switchMap, tap } from 'rxjs';
import {
  Aisle,
  Location,
  LocationLookup,
  Zone,
} from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { AddInventoryLineDto } from './models/inventory.models';

export class InventoryLineLocationState {
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly form = new FormGroup({
    zoneId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    aisleId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    locationId: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
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

  /**
   * Autofills the cascading selector from a scanned location lookup, loading
   * the dependent aisle/location lists in sequence so each select has options.
   */
  applyScannedLocation(lookup: LocationLookup) {
    this.form.patchValue({
      zoneId: lookup.zoneId,
      aisleId: '',
      locationId: '',
    });
    this.locations.set([]);
    this.warehousesService
      .getAisles(this.warehouseId, lookup.zoneId)
      .pipe(
        tap((aisles) => {
          this.aisles.set(aisles);
          this.form.patchValue({ aisleId: lookup.aisleId });
        }),
        switchMap(() =>
          this.warehousesService.getLocations(
            this.warehouseId,
            lookup.zoneId,
            lookup.aisleId,
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((locations) => {
        this.locations.set(locations);
        this.form.patchValue({ locationId: lookup.locationId });
      });
  }

  toDto(): AddInventoryLineDto {
    const raw = this.form.getRawValue();
    return {
      locationId: raw.locationId,
      expectedQty:
        raw.expectedQty === null ? undefined : Number(raw.expectedQty),
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

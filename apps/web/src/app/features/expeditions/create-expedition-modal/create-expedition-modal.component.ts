import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, alertCircleOutline, closeOutline, sendOutline, trashOutline } from 'ionicons/icons';
import { Aisle, Location, Warehouse, Zone } from '../../../core/models/warehouse.models';
import { Product } from '../../../core/models/product.models';
import { ProductsService } from '../../../core/services/products.service';
import { WarehousesService } from '../../../core/services/warehouses.service';

export interface ExpeditionLine {
  productId: string;
  quantity: number;
  notes: string;
}

export interface ExpeditionSubmitData {
  warehouseId: string;
  fromLocationId: string | undefined;
  lines: ExpeditionLine[];
}

@Component({
  selector: 'app-create-expedition-modal',
  standalone: true,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './create-expedition-modal.component.html',
  styleUrl: './create-expedition-modal.component.scss',
})
export class CreateExpeditionModalComponent implements OnInit {
  private readonly warehousesService = inject(WarehousesService);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<ExpeditionSubmitData>();

  // ── Async data ──────────────────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

  // ── Location cascade (source) ───────────────────────────────────────────────
  selectedWarehouseId = '';
  selectedZoneId = '';
  selectedAisleId = '';
  selectedLocationId = '';

  // ── Lines ───────────────────────────────────────────────────────────────────
  lines: ExpeditionLine[] = [{ productId: '', quantity: 1, notes: '' }];
  submitted = false;

  constructor() {
    addIcons({ addOutline, alertCircleOutline, closeOutline, sendOutline, trashOutline });
  }

  ngOnInit() {
    this.productsService
      .getAll({ limit: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.products.set(res.data));

    this.warehousesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((wh) => this.warehouses.set(wh));
  }

  onWarehouseChange(warehouseId: string) {
    this.selectedZoneId = '';
    this.selectedAisleId = '';
    this.selectedLocationId = '';
    this.zones.set([]);
    this.aisles.set([]);
    this.locations.set([]);
    if (!warehouseId) return;
    this.warehousesService
      .getZones(warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((zones) => this.zones.set(zones));
  }

  onZoneChange(zoneId: string) {
    this.selectedAisleId = '';
    this.selectedLocationId = '';
    this.aisles.set([]);
    this.locations.set([]);
    if (!zoneId) return;
    this.warehousesService
      .getAisles(this.selectedWarehouseId, zoneId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((aisles) => this.aisles.set(aisles));
  }

  onAisleChange(aisleId: string) {
    this.selectedLocationId = '';
    this.locations.set([]);
    if (!aisleId) return;
    this.warehousesService
      .getLocations(this.selectedWarehouseId, this.selectedZoneId, aisleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locs) => this.locations.set(locs));
  }

  addLine() {
    this.lines = [...this.lines, { productId: '', quantity: 1, notes: '' }];
  }

  removeLine(index: number) {
    this.lines = this.lines.filter((_, i) => i !== index);
  }

  isLineValid(line: ExpeditionLine): boolean {
    return !!line.productId && line.quantity >= 1;
  }

  isFormValid(): boolean {
    return !!this.selectedWarehouseId && this.lines.length > 0 && this.lines.every((l) => this.isLineValid(l));
  }

  submit() {
    this.submitted = true;
    if (!this.isFormValid()) return;
    this.submitForm.emit({
      warehouseId: this.selectedWarehouseId,
      fromLocationId: this.selectedLocationId || undefined,
      lines: this.lines,
    });
  }
}

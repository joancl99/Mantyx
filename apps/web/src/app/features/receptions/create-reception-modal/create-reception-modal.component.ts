import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, alertCircleOutline, archiveOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { Product } from '../../../core/models/product.models';
import { Aisle, Location, Warehouse, Zone } from '../../../core/models/warehouse.models';
import { ProductsService } from '../../../core/services/products.service';
import { WarehousesService } from '../../../core/services/warehouses.service';

export interface ReceptionLine {
  productId: string;
  quantity: number;
  notes: string;
}

export interface ReceptionSubmitData {
  warehouseId: string;
  toLocationId: string | undefined;
  lines: ReceptionLine[];
}

@Component({
  selector: 'app-create-reception-modal',
  standalone: true,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './create-reception-modal.component.html',
  styleUrl: './create-reception-modal.component.scss',
})
export class CreateReceptionModalComponent implements OnInit {
  private readonly warehousesService = inject(WarehousesService);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<ReceptionSubmitData>();

  // ── Async data ──────────────────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

  // ── Location cascade (plain properties for ngModel) ─────────────────────────
  selectedWarehouseId = '';
  selectedZoneId = '';
  selectedAisleId = '';
  selectedLocationId = '';

  // ── Lines (plain array for ngModel two-way binding) ─────────────────────────
  lines: ReceptionLine[] = [{ productId: '', quantity: 1, notes: '' }];
  submitted = false;

  constructor() {
    addIcons({ addOutline, alertCircleOutline, archiveOutline, closeOutline, trashOutline });
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

  isLineValid(line: ReceptionLine): boolean {
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
      toLocationId: this.selectedLocationId || undefined,
      lines: this.lines,
    });
  }
}

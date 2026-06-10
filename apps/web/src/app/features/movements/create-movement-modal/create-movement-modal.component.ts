import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  closeOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { Product } from '../../../core/models/product.models';
import { StockLocationEntry } from '../../../core/models/stock.models';
import { Aisle, Location, Zone } from '../../../core/models/warehouse.models';
import { StockService } from '../../../core/services/stock.service';
import { WarehousesService } from '../../../core/services/warehouses.service';

/** Payload emitted by the transfer modal; the parent adds `type: 'TRANSFER'`. */
export interface TransferSubmitData {
  productId: string;
  warehouseId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}

/**
 * The Movements page only ever MOVES stock between locations (Receptions and
 * Expeditions own inbound/outbound). The flow: pick a product → pick the origin
 * from its existing stock entries (which implies the warehouse) → pick the
 * destination via the zone→aisle→location cascade within that same warehouse →
 * quantity (capped at the origin's available qty) + notes.
 */
@Component({
  selector: 'app-create-movement-modal',
  standalone: true,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './create-movement-modal.component.html',
  styleUrl: './create-movement-modal.component.scss',
})
export class CreateMovementModalComponent {
  private readonly stockService = inject(StockService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = input.required<Product[]>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<TransferSubmitData>();

  // ── Origin (the product's existing stock entries) ───────────────────────────
  readonly originEntries = signal<StockLocationEntry[]>([]);
  readonly loadingEntries = signal(false);

  // ── Destination cascade (same warehouse as the origin entry) ────────────────
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

  selectedProductId = '';
  selectedFromEntryId = '';
  warehouseId = '';
  selectedZoneId = '';
  selectedAisleId = '';
  selectedToLocationId = '';
  quantity = 1;
  notes = '';
  submitted = false;

  constructor() {
    addIcons({ alertCircleOutline, closeOutline, swapHorizontalOutline });
  }

  get selectedOrigin(): StockLocationEntry | undefined {
    return this.originEntries().find((e) => e.id === this.selectedFromEntryId);
  }

  get maxQuantity(): number {
    return this.selectedOrigin?.quantity ?? 0;
  }

  get sameLocationSelected(): boolean {
    const origin = this.selectedOrigin;
    return !!origin && origin.location.id === this.selectedToLocationId;
  }

  onProductChange(productId: string) {
    this.selectedFromEntryId = '';
    this.warehouseId = '';
    this.quantity = 1;
    this.resetDestination();
    this.originEntries.set([]);
    if (!productId) return;
    this.loadingEntries.set(true);
    this.stockService
      .getStockByProduct(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.originEntries.set(res.entries.filter((e) => e.quantity > 0));
          this.loadingEntries.set(false);
        },
        error: () => this.loadingEntries.set(false),
      });
  }

  onOriginChange(entryId: string) {
    this.quantity = 1;
    this.resetDestination();
    const entry = this.originEntries().find((e) => e.id === entryId);
    if (!entry) {
      this.warehouseId = '';
      return;
    }
    this.warehouseId = entry.location.aisle.zone.warehouse.id;
    this.warehousesService
      .getZones(this.warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((zones) => this.zones.set(zones));
  }

  onZoneChange(zoneId: string) {
    this.selectedAisleId = '';
    this.selectedToLocationId = '';
    this.aisles.set([]);
    this.locations.set([]);
    if (!zoneId) return;
    this.warehousesService
      .getAisles(this.warehouseId, zoneId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((aisles) => this.aisles.set(aisles));
  }

  onAisleChange(aisleId: string) {
    this.selectedToLocationId = '';
    this.locations.set([]);
    if (!aisleId) return;
    this.warehousesService
      .getLocations(this.warehouseId, this.selectedZoneId, aisleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locs) => this.locations.set(locs));
  }

  isFormValid(): boolean {
    const origin = this.selectedOrigin;
    return (
      !!this.selectedProductId &&
      !!origin &&
      !!this.selectedToLocationId &&
      origin.location.id !== this.selectedToLocationId &&
      this.quantity >= 1 &&
      this.quantity <= this.maxQuantity
    );
  }

  submit() {
    this.submitted = true;
    const origin = this.selectedOrigin;
    if (!origin || !this.isFormValid()) return;
    this.submitForm.emit({
      productId: this.selectedProductId,
      warehouseId: this.warehouseId,
      fromLocationId: origin.location.id,
      toLocationId: this.selectedToLocationId,
      quantity: Number(this.quantity),
      notes: this.notes.trim() || undefined,
    });
  }

  private resetDestination() {
    this.selectedZoneId = '';
    this.selectedAisleId = '';
    this.selectedToLocationId = '';
    this.zones.set([]);
    this.aisles.set([]);
    this.locations.set([]);
  }
}

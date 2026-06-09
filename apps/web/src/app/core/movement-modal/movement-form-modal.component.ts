import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  archiveOutline,
  barcodeOutline,
  checkmarkCircleOutline,
  closeOutline,
  downloadOutline,
  sendOutline,
  trashOutline,
} from 'ionicons/icons';
import { Product } from '../models/product.models';
import { Aisle, Location, Warehouse, Zone } from '../models/warehouse.models';
import { CsvExportService } from '../services/csv-export.service';
import { ProductsService } from '../services/products.service';
import { ScannerService } from '../services/scanner.service';
import { WarehousesService } from '../services/warehouses.service';

export interface MovementLine {
  productId: string;
  quantity: number;
  notes: string;
}

export interface MovementSubmitData {
  warehouseId: string;
  /** Source (OUTBOUND) or destination (INBOUND) location — the parent maps it. */
  locationId: string | undefined;
  lines: MovementLine[];
}

/**
 * Per-direction presentation for {@link MovementFormModalComponent}. Receptions
 * (INBOUND) and expeditions (OUTBOUND) share the whole form; only labels, the
 * theme modifier class, the header icon and the CSV wording differ.
 */
export interface MovementModalConfig {
  /** Modifier class on `.modal` carrying the green (reception) / red (expedition) theme. */
  modalClass: 'modal--reception' | 'modal--expedition';
  /** Header ion-icon name, e.g. `archive-outline` / `send-outline`. */
  icon: string;
  /** Prefix for the form control ids, e.g. `reception` / `expedition`. */
  idPrefix: string;
  title: string;
  warehouseSectionLabel: string;
  locationLabel: string;
  locationRequiredAlert: string;
  linesLabel: string;
  notesPlaceholder: string;
  submitLabel: string;
  successTitle: string;
  /** CSV export base filename and the source/destination column header. */
  csvFilename: string;
  csvLocationHeader: string;
}

@Component({
  selector: 'app-movement-form-modal',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './movement-form-modal.component.html',
  styleUrl: './movement-form-modal.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MovementFormModalComponent implements OnInit {
  private readonly warehousesService = inject(WarehousesService);
  private readonly productsService = inject(ProductsService);
  private readonly scannerService = inject(ScannerService);
  private readonly csvExport = inject(CsvExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly config = input.required<MovementModalConfig>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();
  readonly submitSucceeded = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly submitForm = output<MovementSubmitData>();

  lastSubmittedData: MovementSubmitData | null = null;

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
  lines: MovementLine[] = [{ productId: '', quantity: 1, notes: '' }];
  submitted = false;

  constructor() {
    addIcons({
      addOutline,
      alertCircleOutline,
      archiveOutline,
      barcodeOutline,
      checkmarkCircleOutline,
      closeOutline,
      downloadOutline,
      sendOutline,
      trashOutline,
    });
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

  isLineValid(line: MovementLine): boolean {
    return !!line.productId && line.quantity >= 1;
  }

  isFormValid(): boolean {
    return (
      !!this.selectedWarehouseId &&
      !!this.selectedLocationId &&
      this.lines.length > 0 &&
      this.lines.every((l) => this.isLineValid(l))
    );
  }

  scanLine(line: MovementLine) {
    this.scannerService
      .scan()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        const match = this.products().find(
          (p) => p.barcode === result.value || p.sku === result.value,
        );
        if (match) {
          line.productId = match.id;
        }
      });
  }

  submit() {
    this.submitted = true;
    if (!this.isFormValid()) return;
    const data: MovementSubmitData = {
      warehouseId: this.selectedWarehouseId,
      locationId: this.selectedLocationId || undefined,
      lines: this.lines,
    };
    this.lastSubmittedData = data;
    this.submitForm.emit(data);
  }

  exportCsv() {
    const data = this.lastSubmittedData;
    if (!data) return;
    const warehouse = this.warehouses().find((w) => w.id === data.warehouseId);
    const location = this.locations().find((l) => l.id === data.locationId);
    const headers = [
      'Producto',
      'SKU',
      'Barcode',
      'Cantidad',
      'Almacén',
      this.config().csvLocationHeader,
      'Notas',
    ];
    const rows = data.lines.map((line) => {
      const product = this.products().find((p) => p.id === line.productId);
      return [
        product?.name ?? '',
        product?.sku ?? '',
        product?.barcode ?? '',
        line.quantity,
        warehouse?.name ?? '',
        location?.code ?? '',
        line.notes ?? '',
      ];
    });
    this.csvExport.export(this.config().csvFilename, headers, rows);
  }
}

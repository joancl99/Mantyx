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
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  barcodeOutline,
  checkmarkCircleOutline,
  closeOutline,
  downloadOutline,
  sendOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  Aisle,
  Location,
  Warehouse,
  Zone,
} from '../../../core/models/warehouse.models';
import { Product } from '../../../core/models/product.models';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { ProductsService } from '../../../core/services/products.service';
import { ScannerService } from '../../../core/services/scanner.service';
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
  imports: [FormsModule],
  templateUrl: './create-expedition-modal.component.html',
  styleUrl: './create-expedition-modal.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CreateExpeditionModalComponent implements OnInit {
  private readonly warehousesService = inject(WarehousesService);
  private readonly productsService = inject(ProductsService);
  private readonly scannerService = inject(ScannerService);
  private readonly csvExport = inject(CsvExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();
  readonly submitSucceeded = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly submitForm = output<ExpeditionSubmitData>();

  lastSubmittedData: ExpeditionSubmitData | null = null;

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
    addIcons({
      addOutline,
      alertCircleOutline,
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

  isLineValid(line: ExpeditionLine): boolean {
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

  exportCsv() {
    if (!this.lastSubmittedData) return;
    const warehouse = this.warehouses().find(
      (w) => w.id === this.lastSubmittedData!.warehouseId,
    );
    const location = this.locations().find(
      (l) => l.id === this.lastSubmittedData!.fromLocationId,
    );
    const headers = [
      'Producto',
      'SKU',
      'Barcode',
      'Cantidad',
      'Almacén',
      'Ubicación origen',
      'Notas',
    ];
    const rows = this.lastSubmittedData.lines.map((line) => {
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
    this.csvExport.export('expedicion', headers, rows);
  }

  scanLine(line: ExpeditionLine) {
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
    const data: ExpeditionSubmitData = {
      warehouseId: this.selectedWarehouseId,
      fromLocationId: this.selectedLocationId || undefined,
      lines: this.lines,
    };
    this.lastSubmittedData = data;
    this.submitForm.emit(data);
  }
}

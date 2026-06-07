import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import {
  InventoryCount,
  InventoryCountLine,
  InventoryCountStatus,
} from './models/inventory.models';
import { InventoryService } from './data-access/inventory.service';
import { Warehouse } from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { ScannerService } from '../../core/services/scanner.service';
import { CreateInventoryCountModalComponent } from './create-inventory-count-modal/create-inventory-count-modal.component';
import { InventoryCountDetailComponent } from './inventory-count-detail/inventory-count-detail.component';
import { InventoryCountListComponent } from './inventory-count-list/inventory-count-list.component';
import { InventoryFiltersComponent } from './inventory-filters/inventory-filters.component';
import { InventoryLineLocationState } from './inventory-line-location-state';
import { INVENTORY_STATUS_OPTIONS } from './inventory-status';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonIcon,
    InventoryCountListComponent,
    InventoryCountDetailComponent,
    CreateInventoryCountModalComponent,
    InventoryFiltersComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly scannerService = inject(ScannerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly counts = signal<InventoryCount[]>([]);
  readonly selectedCount = signal<InventoryCount | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly lineLocation = new InventoryLineLocationState(
    this.warehousesService,
    this.destroyRef,
  );

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly showCreate = signal(false);
  readonly submitted = signal(false);
  readonly lineSubmitted = signal(false);

  readonly selectedStatus = signal<InventoryCountStatus | ''>('');
  readonly selectedWarehouse = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;
  readonly statusOptions = INVENTORY_STATUS_OPTIONS;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  readonly totalLabel = computed(() => {
    const t = this.total();
    return t === 0 ? 'Sin conteos' : `${t} conteo${t === 1 ? '' : 's'}`;
  });

  readonly createForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    warehouseId: new FormControl('', Validators.required),
  });

  constructor() {
    addIcons({ addOutline });
  }

  ngOnInit() {
    this.loadWarehouses();
    this.loadCounts();
  }

  loadCounts() {
    this.loading.set(true);
    this.inventoryService
      .getAll({
        status: this.selectedStatus() || undefined,
        warehouseId: this.selectedWarehouse() || undefined,
        page: this.currentPage(),
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.counts.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
          const selected = this.selectedCount();
          if (selected && !res.data.some((count) => count.id === selected.id)) {
            this.selectedCount.set(null);
          }
        },
        error: () => this.loading.set(false),
      });
  }

  loadDetail(count: InventoryCount) {
    this.detailLoading.set(true);
    this.formError.set('');
    this.inventoryService
      .getOne(count.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.selectedCount.set(detail);
          this.detailLoading.set(false);
          this.lineSubmitted.set(false);
          this.lineLocation.resetForWarehouse(detail.warehouseId);
        },
        error: () => this.detailLoading.set(false),
      });
  }

  onStatusChange(status: InventoryCountStatus | '') {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadCounts();
  }

  onWarehouseFilterChange(warehouseId: string) {
    this.selectedWarehouse.set(warehouseId);
    this.currentPage.set(1);
    this.loadCounts();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadCounts();
  }

  openCreate() {
    this.createForm.reset({ name: '', warehouseId: this.selectedWarehouse() });
    this.submitted.set(false);
    this.formError.set('');
    this.showCreate.set(true);
  }

  closeCreate() {
    this.showCreate.set(false);
  }

  submitCreate() {
    this.submitted.set(true);
    if (this.createForm.invalid) return;

    this.saving.set(true);
    this.formError.set('');
    const raw = this.createForm.getRawValue();
    this.inventoryService
      .create({ name: raw.name!, warehouseId: raw.warehouseId! })
      .subscribe({
        next: (count) => {
          this.saving.set(false);
          this.showCreate.set(false);
          this.loadCounts();
          this.loadDetail(count);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'Error al crear el conteo');
        },
      });
  }

  startSelected() {
    const count = this.selectedCount();
    if (!count) return;
    this.saving.set(true);
    this.inventoryService.start(count.id).subscribe({
      next: (updated) => this.afterDetailAction(updated),
      error: (err) => this.handleActionError(err, 'Error al iniciar el conteo'),
    });
  }

  completeSelected() {
    const count = this.selectedCount();
    if (!count) return;
    this.saving.set(true);
    this.inventoryService.complete(count.id).subscribe({
      next: (updated) => this.afterDetailAction(updated),
      error: (err) =>
        this.handleActionError(err, 'Error al completar el conteo'),
    });
  }

  onZoneChange(zoneId: string) {
    this.lineLocation.onZoneChange(zoneId);
  }

  onAisleChange(aisleId: string) {
    this.lineLocation.onAisleChange(aisleId);
  }

  scanLocation() {
    const count = this.selectedCount();
    if (!count) return;
    this.scannerService
      .scan()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const code = result?.value?.trim();
        if (!code) return;
        this.formError.set('');
        this.warehousesService
          .findLocationByCode(count.warehouseId, code)
          .subscribe({
            next: (lookup) => this.lineLocation.applyScannedLocation(lookup),
            error: (err) =>
              this.formError.set(
                err?.error?.message ??
                  `No se encontró la ubicación "${code}" en este almacén.`,
              ),
          });
      });
  }

  submitLine() {
    const count = this.selectedCount();
    if (!count) return;
    this.lineSubmitted.set(true);
    if (this.lineLocation.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');
    this.inventoryService
      .addLine(count.id, this.lineLocation.toDto())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.loadDetail(count);
        },
        error: (err) => this.handleActionError(err, 'Error al añadir la línea'),
      });
  }

  updateLine(event: { line: InventoryCountLine; countedQty: number }) {
    const count = this.selectedCount();
    if (!count) return;

    this.inventoryService
      .updateLine(count.id, event.line.id, event.countedQty)
      .subscribe({
        next: () => this.loadDetail(count),
        error: (err) =>
          this.handleActionError(err, 'Error al actualizar la línea'),
      });
  }

  removeLine(line: InventoryCountLine) {
    const count = this.selectedCount();
    if (!count) return;
    this.saving.set(true);
    this.inventoryService.removeLine(count.id, line.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadDetail(count);
      },
      error: (err) => this.handleActionError(err, 'Error al eliminar la línea'),
    });
  }

  private loadWarehouses() {
    this.warehousesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouses) => this.warehouses.set(warehouses));
  }

  private afterDetailAction(updated: InventoryCount) {
    this.saving.set(false);
    this.selectedCount.set(updated);
    this.loadCounts();
  }

  private handleActionError(err: any, fallback: string) {
    this.saving.set(false);
    this.formError.set(err?.error?.message ?? fallback);
  }
}

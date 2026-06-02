import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  archiveOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  listOutline,
  playOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  AddInventoryLineDto,
  InventoryCount,
  InventoryCountLine,
  InventoryCountStatus,
  InventoryService,
} from '../../core/services/inventory.service';
import {
  Aisle,
  Location,
  Warehouse,
  WarehousesService,
  Zone,
} from '../../core/services/warehouses.service';

const STATUS_OPTIONS: { value: InventoryCountStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly counts = signal<InventoryCount[]>([]);
  readonly selectedCount = signal<InventoryCount | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);

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
  readonly statusOptions = STATUS_OPTIONS;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly totalLabel = computed(() => {
    const t = this.total();
    return t === 0 ? 'Sin conteos' : `${t} conteo${t === 1 ? '' : 's'}`;
  });
  readonly selectedLines = computed(() => this.selectedCount()?.lines ?? []);
  readonly isReadOnly = computed(() => this.selectedCount()?.status === 'COMPLETED');
  readonly canStart = computed(() => this.selectedCount()?.status === 'DRAFT');
  readonly canComplete = computed(() => this.selectedCount()?.status === 'IN_PROGRESS');

  readonly createForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    warehouseId: new FormControl('', Validators.required),
  });

  readonly lineForm = new FormGroup({
    zoneId: new FormControl('', Validators.required),
    aisleId: new FormControl('', Validators.required),
    locationId: new FormControl('', Validators.required),
    expectedQty: new FormControl<number | null>(null, Validators.min(0)),
  });

  constructor() {
    addIcons({
      addOutline,
      archiveOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      listOutline,
      playOutline,
      refreshOutline,
      trashOutline,
    });
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
          this.resetLineForm();
          this.loadZones(detail.warehouseId);
        },
        error: () => this.detailLoading.set(false),
      });
  }

  onStatusChange(event: Event) {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as InventoryCountStatus | '');
    this.currentPage.set(1);
    this.loadCounts();
  }

  onWarehouseFilterChange(event: Event) {
    this.selectedWarehouse.set((event.target as HTMLSelectElement).value);
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
      error: (err) => this.handleActionError(err, 'Error al completar el conteo'),
    });
  }

  onZoneChange(event: Event) {
    const zoneId = (event.target as HTMLSelectElement).value;
    this.lineForm.patchValue({ zoneId, aisleId: '', locationId: '' });
    this.aisles.set([]);
    this.locations.set([]);
    const count = this.selectedCount();
    if (count && zoneId) this.loadAisles(count.warehouseId, zoneId);
  }

  onAisleChange(event: Event) {
    const aisleId = (event.target as HTMLSelectElement).value;
    this.lineForm.patchValue({ aisleId, locationId: '' });
    this.locations.set([]);
    const count = this.selectedCount();
    const zoneId = this.lineForm.controls.zoneId.value;
    if (count && zoneId && aisleId) this.loadLocations(count.warehouseId, zoneId, aisleId);
  }

  submitLine() {
    const count = this.selectedCount();
    if (!count) return;
    this.lineSubmitted.set(true);
    if (this.lineForm.invalid) return;

    const raw = this.lineForm.getRawValue();
    const dto: AddInventoryLineDto = {
      locationId: raw.locationId!,
      expectedQty: raw.expectedQty === null ? undefined : Number(raw.expectedQty),
    };

    this.saving.set(true);
    this.formError.set('');
    this.inventoryService.addLine(count.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadDetail(count);
      },
      error: (err) => this.handleActionError(err, 'Error al añadir la línea'),
    });
  }

  updateLine(line: InventoryCountLine, event: Event) {
    const count = this.selectedCount();
    if (!count) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(value) || value < 0) return;

    this.inventoryService.updateLine(count.id, line.id, value).subscribe({
      next: () => this.loadDetail(count),
      error: (err) => this.handleActionError(err, 'Error al actualizar la línea'),
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

  statusLabel(status: InventoryCountStatus) {
    return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  }

  lineLocationLabel(line: InventoryCountLine) {
    const aisle = line.location.aisle;
    return `${aisle.zone.name} / ${aisle.name} / ${line.location.code}`;
  }

  private loadWarehouses() {
    this.warehousesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouses) => this.warehouses.set(warehouses));
  }

  private loadZones(warehouseId: string) {
    this.warehousesService
      .getZones(warehouseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((zones) => this.zones.set(zones));
  }

  private loadAisles(warehouseId: string, zoneId: string) {
    this.warehousesService
      .getAisles(warehouseId, zoneId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((aisles) => this.aisles.set(aisles));
  }

  private loadLocations(warehouseId: string, zoneId: string, aisleId: string) {
    this.warehousesService
      .getLocations(warehouseId, zoneId, aisleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locations) => this.locations.set(locations));
  }

  private resetLineForm() {
    this.lineSubmitted.set(false);
    this.lineForm.reset({ zoneId: '', aisleId: '', locationId: '', expectedQty: null });
    this.aisles.set([]);
    this.locations.set([]);
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

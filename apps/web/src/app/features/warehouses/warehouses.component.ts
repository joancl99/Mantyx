import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonTitle,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  businessOutline,
  createOutline,
  powerOutline,
  closeOutline,
  alertCircleOutline,
  layersOutline,
  chevronForwardOutline,
  gitBranchOutline,
  trashOutline,
  cubeOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import {
  Aisle,
  CreateWarehouseDto,
  Location,
  Warehouse,
  WarehouseSubLevel,
  Zone,
} from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { WarehouseBreadcrumbComponent } from './warehouse-breadcrumb/warehouse-breadcrumb.component';
import { WarehouseListComponent } from './warehouse-list/warehouse-list.component';
import {
  WarehouseBreadcrumbTarget,
  WarehouseNavigationState,
} from './warehouse-navigation-state';
import { WarehouseSublevelListComponent } from './warehouse-sublevel-list/warehouse-sublevel-list.component';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonTitle,
    IonIcon,
    IonSpinner,
    WarehouseBreadcrumbComponent,
    WarehouseListComponent,
    WarehouseSublevelListComponent,
  ],
  templateUrl: './warehouses.component.html',
  styleUrl: './warehouses.component.scss',
})
export class WarehousesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly whService = inject(WarehousesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canEdit = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN';
  });

  readonly canManage = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'MANAGER';
  });

  readonly navigation = new WarehouseNavigationState();

  // ── Warehouses ────────────────────────────────────────────────────────────────
  readonly warehouses = signal<Warehouse[]>([]);
  readonly whLoading = signal(true);
  readonly whSaving = signal(false);
  readonly activeCount = computed(
    () => this.warehouses().filter((w) => w.isActive).length,
  );
  readonly totalCount = computed(() => this.warehouses().length);

  readonly showWhModal = signal(false);
  readonly whModalMode = signal<'create' | 'edit'>('create');
  readonly whEditingId = signal<string | null>(null);
  readonly whSubmitted = signal(false);
  readonly whFormError = signal('');
  readonly toggleTarget = signal<Warehouse | null>(null);

  readonly whForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    address: new FormControl('', { nonNullable: true }),
  });

  // ── Sub-levels (zones / aisles / locations) ───────────────────────────────────
  readonly zones = signal<Zone[]>([]);
  readonly aisles = signal<Aisle[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly subLoading = signal(false);
  readonly subSaving = signal(false);
  readonly subDeleting = signal(false);

  readonly showSubModal = signal(false);
  readonly subModalMode = signal<'create' | 'edit'>('create');
  readonly subLevel = signal<WarehouseSubLevel>('zone');
  readonly subEditingId = signal<string | null>(null);
  readonly subSubmitted = signal(false);
  readonly subError = signal('');
  readonly subForm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  readonly deleteTarget = signal<{
    id: string;
    label: string;
    level: WarehouseSubLevel;
  } | null>(null);
  readonly deleteError = signal('');

  constructor() {
    addIcons({
      addOutline,
      businessOutline,
      createOutline,
      powerOutline,
      closeOutline,
      alertCircleOutline,
      layersOutline,
      chevronForwardOutline,
      gitBranchOutline,
      trashOutline,
      cubeOutline,
    });
  }

  ngOnInit() {
    this.loadWarehouses();
  }

  // ── Warehouse methods ─────────────────────────────────────────────────────────
  loadWarehouses() {
    this.whLoading.set(true);
    this.whService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.warehouses.set(list);
          this.whLoading.set(false);
        },
        error: () => this.whLoading.set(false),
      });
  }

  openCreateWh() {
    this.whForm.reset();
    this.whSubmitted.set(false);
    this.whFormError.set('');
    this.whEditingId.set(null);
    this.whModalMode.set('create');
    this.showWhModal.set(true);
  }

  openEditWh(wh: Warehouse) {
    this.whForm.patchValue({ name: wh.name, address: wh.address ?? '' });
    this.whSubmitted.set(false);
    this.whFormError.set('');
    this.whEditingId.set(wh.id);
    this.whModalMode.set('edit');
    this.showWhModal.set(true);
  }

  closeWhModal() {
    this.showWhModal.set(false);
  }

  submitWhForm() {
    this.whSubmitted.set(true);
    if (this.whForm.invalid) return;
    this.whSaving.set(true);
    this.whFormError.set('');
    const raw = this.whForm.getRawValue();
    const dto: CreateWarehouseDto = {
      name: raw.name,
      address: raw.address || undefined,
    };
    const editingId = this.whEditingId();
    const req$ =
      this.whModalMode() === 'edit' && editingId !== null
        ? this.whService.update(editingId, dto)
        : this.whService.create(dto);
    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.whSaving.set(false);
        this.showWhModal.set(false);
        this.loadWarehouses();
      },
      error: (err) => {
        this.whSaving.set(false);
        this.whFormError.set(
          err?.error?.message ?? 'Error al guardar el almacén',
        );
      },
    });
  }

  confirmToggle(wh: Warehouse) {
    this.toggleTarget.set(wh);
  }
  cancelToggle() {
    this.toggleTarget.set(null);
  }

  executeToggle() {
    const wh = this.toggleTarget();
    if (!wh) return;
    this.whSaving.set(true);
    this.whService
      .toggleActive(wh.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.whSaving.set(false);
          this.toggleTarget.set(null);
          this.loadWarehouses();
        },
        error: () => {
          this.whSaving.set(false);
          this.toggleTarget.set(null);
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  enterZones(wh: Warehouse) {
    this.navigation.enterWarehouse(wh);
    this.loadZones();
  }

  enterAisles(zone: Zone) {
    this.navigation.enterZone(zone);
    this.loadAisles();
  }

  enterLocations(aisle: Aisle) {
    this.navigation.enterAisle(aisle);
    this.loadLocations();
  }

  goBack() {
    this.navigation.goBack();
  }

  goToLevel(target: WarehouseBreadcrumbTarget) {
    this.navigation.goToLevel(target);
  }

  // ── Sub-level loaders ─────────────────────────────────────────────────────────
  loadZones() {
    const warehouse = this.navigation.selectedWarehouse();
    if (!warehouse) return;
    const wId = warehouse.id;
    this.subLoading.set(true);
    this.whService
      .getZones(wId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.zones.set(list);
          this.subLoading.set(false);
        },
        error: () => this.subLoading.set(false),
      });
  }

  loadAisles() {
    const warehouse = this.navigation.selectedWarehouse();
    const zone = this.navigation.selectedZone();
    if (!warehouse || !zone) return;
    const wId = warehouse.id;
    const zId = zone.id;
    this.subLoading.set(true);
    this.whService
      .getAisles(wId, zId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.aisles.set(list);
          this.subLoading.set(false);
        },
        error: () => this.subLoading.set(false),
      });
  }

  loadLocations() {
    const warehouse = this.navigation.selectedWarehouse();
    const zone = this.navigation.selectedZone();
    const aisle = this.navigation.selectedAisle();
    if (!warehouse || !zone || !aisle) return;
    const wId = warehouse.id;
    const zId = zone.id;
    const aId = aisle.id;
    this.subLoading.set(true);
    this.whService
      .getLocations(wId, zId, aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.locations.set(list);
          this.subLoading.set(false);
        },
        error: () => this.subLoading.set(false),
      });
  }

  private reloadCurrentLevel() {
    const view = this.navigation.currentView();
    if (view === 'zones') this.loadZones();
    else if (view === 'aisles') this.loadAisles();
    else if (view === 'locations') this.loadLocations();
  }

  // ── Sub-level CRUD ────────────────────────────────────────────────────────────
  openCreate(level: WarehouseSubLevel) {
    this.subForm.reset('');
    this.subSubmitted.set(false);
    this.subError.set('');
    this.subEditingId.set(null);
    this.subLevel.set(level);
    this.subModalMode.set('create');
    this.showSubModal.set(true);
  }

  openEdit(id: string, value: string, level: WarehouseSubLevel) {
    this.subForm.setValue(value);
    this.subSubmitted.set(false);
    this.subError.set('');
    this.subEditingId.set(id);
    this.subLevel.set(level);
    this.subModalMode.set('edit');
    this.showSubModal.set(true);
  }

  closeSubModal() {
    this.showSubModal.set(false);
  }

  subModalTitle(): string {
    const mode = this.subModalMode() === 'create' ? 'Nueva' : 'Editar';
    const labels: Record<WarehouseSubLevel, string> = {
      zone: 'zona',
      aisle: 'pasillo',
      location: 'ubicación',
    };
    return `${mode} ${labels[this.subLevel()]}`;
  }

  subModalLabel(): string {
    const labels: Record<WarehouseSubLevel, string> = {
      zone: 'Nombre',
      aisle: 'Nombre',
      location: 'Código',
    };
    return labels[this.subLevel()];
  }

  subModalPlaceholder(): string {
    const ph: Record<WarehouseSubLevel, string> = {
      zone: 'Zona A',
      aisle: 'Pasillo 1',
      location: 'A-01-01',
    };
    return ph[this.subLevel()];
  }

  submitSubForm() {
    this.subSubmitted.set(true);
    if (this.subForm.invalid) return;
    const warehouse = this.navigation.selectedWarehouse();
    if (!warehouse) return;
    const value = this.subForm.value.trim();
    this.subSaving.set(true);
    this.subError.set('');
    const wId = warehouse.id;
    const zId = this.navigation.selectedZone()?.id ?? '';
    const aId = this.navigation.selectedAisle()?.id ?? '';
    const editId = this.subEditingId();
    const level = this.subLevel();
    const isEdit = this.subModalMode() === 'edit' && editId !== null;

    let req$: Observable<unknown>;
    if (isEdit) {
      // `isEdit` already guarantees a non-null editId.
      if (level === 'zone') {
        req$ = this.whService.renameZone(wId, editId, value);
      } else if (level === 'aisle') {
        req$ = this.whService.renameAisle(wId, zId, editId, value);
      } else {
        req$ = this.whService.renameLocation(wId, zId, aId, editId, value);
      }
    } else if (level === 'zone') {
      req$ = this.whService.createZone(wId, value);
    } else if (level === 'aisle') {
      req$ = this.whService.createAisle(wId, zId, value);
    } else {
      req$ = this.whService.createLocation(wId, zId, aId, value);
    }

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.subSaving.set(false);
        this.showSubModal.set(false);
        this.reloadCurrentLevel();
      },
      error: (err) => {
        this.subSaving.set(false);
        this.subError.set(err?.error?.message ?? 'Error al guardar');
      },
    });
  }

  confirmDelete(id: string, label: string, level: WarehouseSubLevel) {
    this.deleteError.set('');
    this.deleteTarget.set({ id, label, level });
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  executeDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    const warehouse = this.navigation.selectedWarehouse();
    if (!warehouse) return;
    this.subDeleting.set(true);
    this.deleteError.set('');
    const wId = warehouse.id;
    const zId = this.navigation.selectedZone()?.id ?? '';
    const aId = this.navigation.selectedAisle()?.id ?? '';

    let req$: Observable<unknown>;
    if (target.level === 'zone')
      req$ = this.whService.deleteZone(wId, target.id);
    else if (target.level === 'aisle')
      req$ = this.whService.deleteAisle(wId, zId, target.id);
    else req$ = this.whService.deleteLocation(wId, zId, aId, target.id);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.subDeleting.set(false);
        this.deleteTarget.set(null);
        this.reloadCurrentLevel();
      },
      error: (err) => {
        this.subDeleting.set(false);
        this.deleteError.set(err?.error?.message ?? 'Error al eliminar');
      },
    });
  }

  deleteLevelLabel(level: WarehouseSubLevel): string {
    const labels: Record<WarehouseSubLevel, string> = {
      zone: 'zona',
      aisle: 'pasillo',
      location: 'ubicación',
    };
    return labels[level];
  }
}

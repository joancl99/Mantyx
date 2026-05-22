import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
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
  locationOutline,
  layersOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import {
  WarehousesService,
  Warehouse,
  CreateWarehouseDto,
} from '../../core/services/warehouses.service';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './warehouses.component.html',
  styleUrl: './warehouses.component.scss',
})
export class WarehousesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly canEdit = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN';
  });

  readonly activeCount = computed(() => this.warehouses().filter((w) => w.isActive).length);
  readonly totalCount = computed(() => this.warehouses().length);

  readonly showModal = signal(false);
  readonly modalMode = signal<ModalMode>('create');
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly formError = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    address: new FormControl(''),
  });

  readonly toggleTarget = signal<Warehouse | null>(null);

  constructor() {
    addIcons({
      addOutline,
      businessOutline,
      createOutline,
      powerOutline,
      closeOutline,
      alertCircleOutline,
      locationOutline,
      layersOutline,
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.warehousesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.warehouses.set(list); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  openCreate() {
    this.form.reset();
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(wh: Warehouse) {
    this.form.patchValue({ name: wh.name, address: wh.address ?? '' });
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(wh.id);
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitForm() {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');
    const raw = this.form.getRawValue();
    const dto: CreateWarehouseDto = {
      name: raw.name!,
      address: raw.address || undefined,
    };

    const req$ = this.modalMode() === 'create'
      ? this.warehousesService.create(dto)
      : this.warehousesService.update(this.editingId()!, dto);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Error al guardar el almacén');
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
    this.saving.set(true);
    this.warehousesService
      .toggleActive(wh.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.saving.set(false); this.toggleTarget.set(null); this.load(); },
        error: () => { this.saving.set(false); this.toggleTarget.set(null); },
      });
  }
}

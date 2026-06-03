import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import {
  MovementType,
  CreateMovementDto,
} from '../../core/models/stock.models';
import { StockService } from '../../core/services/stock.service';
import { Product } from '../../core/models/product.models';
import { ProductsService } from '../../core/services/products.service';
import { Warehouse } from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';
import { CreateMovementModalComponent } from './create-movement-modal/create-movement-modal.component';
import { MovementFiltersComponent } from './movement-filters/movement-filters.component';
import { MovementListComponent } from './movement-list/movement-list.component';
import { MovementsListState } from './movements-list-state';
import { MOVEMENT_FORM_TYPES, MOVEMENT_TYPE_CONFIG } from './movement-types';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    CreateMovementModalComponent,
    MovementFiltersComponent,
    MovementListComponent,
  ],
  templateUrl: './movements.component.html',
  styleUrl: './movements.component.scss',
})
export class MovementsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly productsService = inject(ProductsService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeConfig = MOVEMENT_TYPE_CONFIG;
  readonly availableTypes = MOVEMENT_FORM_TYPES;

  // ── State ──────────────────────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly saving = signal(false);
  readonly list = new MovementsListState(this.stockService, this.destroyRef);

  // ── Permissions ──────────────────────────────────────────────────────────
  readonly canCreate = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';
  });

  // ── Modal ────────────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly submitted = signal(false);
  readonly formError = signal('');

  readonly form = new FormGroup({
    productId: new FormControl('', Validators.required),
    warehouseId: new FormControl('', Validators.required),
    type: new FormControl<MovementType>('INBOUND', Validators.required),
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
    notes: new FormControl(''),
  });

  constructor() {
    addIcons({
      addOutline,
    });
  }

  ngOnInit() {
    this.list.load();
    this.loadFormData();
  }

  private loadFormData() {
    this.productsService
      .getAll({ limit: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.products.set(res.data));

    this.warehousesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((wh) => this.warehouses.set(wh));
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  openCreate() {
    this.form.reset({ type: 'INBOUND', quantity: 1 });
    this.submitted.set(false);
    this.formError.set('');
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

    const dto: CreateMovementDto = {
      productId: raw.productId!,
      warehouseId: raw.warehouseId!,
      type: raw.type!,
      quantity: Number(raw.quantity),
      notes: raw.notes || undefined,
    };

    this.stockService
      .create(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showModal.set(false);
          this.list.currentPage.set(1);
          this.list.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'Error al registrar el movimiento');
        },
      });
  }

}

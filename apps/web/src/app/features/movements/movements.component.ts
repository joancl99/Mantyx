import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowDownOutline,
  arrowUpOutline,
  swapHorizontalOutline,
  refreshOutline,
  returnDownBackOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  alertCircleOutline,
  filterOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import {
  StockService,
  StockMovement,
  MovementType,
  CreateMovementDto,
} from '../../core/services/stock.service';
import { Product } from '../../core/models/product.models';
import { ProductsService } from '../../core/services/products.service';
import { Warehouse } from '../../core/models/warehouse.models';
import { WarehousesService } from '../../core/services/warehouses.service';

interface TypeConfig {
  label: string;
  icon: string;
  cssClass: string;
  sign: string;
}

const TYPE_CONFIG: Record<MovementType, TypeConfig> = {
  INBOUND: {
    label: 'Entrada',
    icon: 'arrow-down-outline',
    cssClass: 'type--inbound',
    sign: '+',
  },
  OUTBOUND: {
    label: 'Salida',
    icon: 'arrow-up-outline',
    cssClass: 'type--outbound',
    sign: '-',
  },
  TRANSFER: {
    label: 'Traslado',
    icon: 'swap-horizontal-outline',
    cssClass: 'type--transfer',
    sign: '↔',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    icon: 'refresh-outline',
    cssClass: 'type--adjustment',
    sign: '~',
  },
  RETURN: {
    label: 'Devolución',
    icon: 'return-down-back-outline',
    cssClass: 'type--return',
    sign: '+',
  },
};

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    IonContent,
    IonIcon,
    IonSpinner,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
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

  readonly typeConfig = TYPE_CONFIG;
  readonly availableTypes: MovementType[] = [
    'INBOUND',
    'OUTBOUND',
    'RETURN',
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  readonly movements = signal<StockMovement[]>([]);
  readonly products = signal<Product[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly filterType = signal<MovementType | ''>('');
  readonly filterDateFrom = signal('');
  readonly filterDateTo = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  readonly totalLabel = computed(() => {
    const t = this.total();
    return t === 0 ? 'Sin resultados' : `${t} movimiento${t === 1 ? '' : 's'}`;
  });

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
      arrowDownOutline,
      arrowUpOutline,
      swapHorizontalOutline,
      refreshOutline,
      returnDownBackOutline,
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      alertCircleOutline,
      filterOutline,
      documentTextOutline,
    });
  }

  ngOnInit() {
    this.loadMovements();
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

  loadMovements() {
    this.loading.set(true);
    this.stockService
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize,
        type: this.filterType() || undefined,
        dateFrom: this.filterDateFrom() || undefined,
        dateTo: this.filterDateTo() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.movements.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onTypeFilter(event: Event) {
    this.filterType.set((event.target as HTMLSelectElement).value as MovementType | '');
    this.currentPage.set(1);
    this.loadMovements();
  }

  onDateFromFilter(event: Event) {
    this.filterDateFrom.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.loadMovements();
  }

  onDateToFilter(event: Event) {
    this.filterDateTo.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.loadMovements();
  }

  clearFilters() {
    this.filterType.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.currentPage.set(1);
    this.loadMovements();
  }

  readonly hasActiveFilters = computed(
    () => !!this.filterType() || !!this.filterDateFrom() || !!this.filterDateTo(),
  );

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadMovements();
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
          this.currentPage.set(1);
          this.loadMovements();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'Error al registrar el movimiento');
        },
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  typeLabel(type: MovementType): string {
    return TYPE_CONFIG[type]?.label ?? type;
  }

  typeCssClass(type: MovementType): string {
    return TYPE_CONFIG[type]?.cssClass ?? '';
  }

  typeIcon(type: MovementType): string {
    return TYPE_CONFIG[type]?.icon ?? 'document-text-outline';
  }

  quantityDisplay(m: StockMovement): string {
    const cfg = TYPE_CONFIG[m.type];
    if (!cfg) return String(m.quantity);
    if (m.type === 'OUTBOUND') return `-${m.quantity}`;
    if (m.type === 'INBOUND' || m.type === 'RETURN') return `+${m.quantity}`;
    return String(m.quantity);
  }

  stockDelta(m: StockMovement): string {
    return `${m.previousStock} → ${m.newStock}`;
  }
}

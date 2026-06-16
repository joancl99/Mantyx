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
import {
  IonContent,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, downloadOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import {
  CreateMovementDto,
  StockMovement,
} from '../../core/models/stock.models';
import { StockService } from '../../core/services/stock.service';
import { Product } from '../../core/models/product.models';
import { ProductsService } from '../../core/services/products.service';
import {
  CreateMovementModalComponent,
  TransferSubmitData,
} from './create-movement-modal/create-movement-modal.component';
import { MovementFiltersComponent } from './movement-filters/movement-filters.component';
import { MovementListComponent } from './movement-list/movement-list.component';
import { MovementsListState } from './movements-list-state';

@Component({
  selector: 'app-movements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
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
  private readonly csvExport = inject(CsvExportService);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly saving = signal(false);
  readonly list = new MovementsListState(this.stockService, this.destroyRef);

  // ── Permissions ──────────────────────────────────────────────────────────
  readonly canCreate = computed(() => {
    const role = this.auth.currentUser()?.role;
    return (
      role === 'SUPERADMIN' ||
      role === 'ADMIN' ||
      role === 'MANAGER' ||
      role === 'OPERATOR'
    );
  });

  // ── Modal ────────────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly formError = signal('');

  constructor() {
    addIcons({
      addOutline,
      downloadOutline,
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
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  exportCsv() {
    this.stockService
      .getAll({
        limit: 9999,
        type: this.list.filterType() || undefined,
        dateFrom: this.list.filterDateFrom() || undefined,
        dateTo: this.list.filterDateTo() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const headers = [
          'Fecha',
          'Tipo',
          'Producto',
          'SKU',
          'Cantidad',
          'Stock anterior',
          'Stock nuevo',
          'Almacén',
          'Notas',
        ];
        const rows = res.data.map((m: StockMovement) => [
          new Date(m.createdAt).toLocaleDateString('es-ES'),
          m.type,
          m.product.name,
          m.product.sku,
          m.quantity,
          m.previousStock,
          m.newStock,
          m.warehouse.name,
          m.notes ?? '',
        ]);
        this.csvExport.export('movimientos', headers, rows);
      });
  }

  openCreate() {
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitTransfer(data: TransferSubmitData) {
    this.saving.set(true);
    this.formError.set('');

    const dto: CreateMovementDto = {
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: 'TRANSFER',
      quantity: data.quantity,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      notes: data.notes,
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
          this.formError.set(
            err?.error?.message ?? 'Error al registrar el traslado',
          );
        },
      });
  }
}

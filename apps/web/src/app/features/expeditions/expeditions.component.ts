import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
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
import { addOutline, downloadOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { StockService } from '../../core/services/stock.service';
import {
  CreateMovementDto,
  StockMovement,
} from '../../core/models/stock.models';
import {
  MovementFormModalComponent,
  MovementModalConfig,
  MovementSubmitData,
} from '../../core/movement-modal/movement-form-modal.component';
import { ExpeditionsListState } from './expeditions-list-state';
import { ExpeditionFiltersComponent } from './expedition-filters/expedition-filters.component';
import { ExpeditionListComponent } from './expedition-list/expedition-list.component';

@Component({
  selector: 'app-expeditions',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    ExpeditionFiltersComponent,
    ExpeditionListComponent,
    MovementFormModalComponent,
  ],
  templateUrl: './expeditions.component.html',
  styleUrl: './expeditions.component.scss',
})
export class ExpeditionsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly csvExport = inject(CsvExportService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly formError = signal('');
  readonly showModal = signal(false);
  readonly submitSucceeded = signal(false);
  readonly list = new ExpeditionsListState(this.stockService, this.destroyRef);

  readonly modalConfig: MovementModalConfig = {
    modalClass: 'modal--expedition',
    icon: 'send-outline',
    idPrefix: 'expedition',
    title: 'Nueva Expedición',
    warehouseSectionLabel: 'Almacén de origen',
    locationLabel: 'Ubicación de recogida *',
    locationRequiredAlert: 'Selecciona una ubicación de origen',
    linesLabel: 'Productos a expedir',
    notesPlaceholder: 'Pedido, referencia...',
    submitLabel: 'Registrar expedición',
    successTitle: 'Expedición registrada',
    csvFilename: 'expedicion',
    csvLocationHeader: 'Ubicación origen',
  };

  readonly canCreate = computed(() => {
    const role = this.auth.currentUser()?.role;
    return (
      role === 'SUPERADMIN' ||
      role === 'ADMIN' ||
      role === 'MANAGER' ||
      role === 'OPERATOR'
    );
  });

  constructor() {
    addIcons({ addOutline, downloadOutline });
  }

  ngOnInit() {
    this.list.load();
  }

  exportCsv() {
    this.stockService
      .getAll({
        type: 'OUTBOUND',
        limit: 9999,
        dateFrom: this.list.filterDateFrom() || undefined,
        dateTo: this.list.filterDateTo() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const headers = [
          'Fecha',
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
          m.product.name,
          m.product.sku,
          m.quantity,
          m.previousStock,
          m.newStock,
          m.warehouse.name,
          m.notes ?? '',
        ]);
        this.csvExport.export('expediciones', headers, rows);
      });
  }

  openModal() {
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.submitSucceeded.set(false);
  }

  onSubmit(data: MovementSubmitData) {
    this.saving.set(true);
    this.formError.set('');

    const requests = data.lines.map((line) => {
      const dto: CreateMovementDto = {
        productId: line.productId,
        warehouseId: data.warehouseId,
        type: 'OUTBOUND',
        quantity: line.quantity,
        fromLocationId: data.locationId,
        notes: line.notes || undefined,
      };
      return this.stockService.create(dto);
    });

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.submitSucceeded.set(true);
          this.list.currentPage.set(1);
          this.list.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(
            err?.error?.message ?? 'Error al registrar la expedición',
          );
        },
      });
  }
}

import {
  ChangeDetectionStrategy,
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
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, barcodeOutline, downloadOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { StockService } from '../../core/services/stock.service';
import { ScannerService } from '../../core/services/scanner.service';
import {
  CreateMovementDto,
  StockMovement,
} from '../../core/models/stock.models';
import {
  MovementFormModalComponent,
  MovementModalConfig,
  MovementSubmitData,
} from '../../core/movement-modal/movement-form-modal.component';
import { ReceptionsListState } from './receptions-list-state';
import { ReceptionFiltersComponent } from './reception-filters/reception-filters.component';
import { ReceptionListComponent } from './reception-list/reception-list.component';

@Component({
  selector: 'app-receptions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonTitle,
    IonIcon,
    ReceptionFiltersComponent,
    ReceptionListComponent,
    MovementFormModalComponent,
  ],
  templateUrl: './receptions.component.html',
  styleUrl: './receptions.component.scss',
})
export class ReceptionsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly csvExport = inject(CsvExportService);
  private readonly destroyRef = inject(DestroyRef);
  readonly scanner = inject(ScannerService);

  readonly saving = signal(false);
  readonly formError = signal('');
  readonly showModal = signal(false);
  readonly submitSucceeded = signal(false);
  readonly list = new ReceptionsListState(this.stockService, this.destroyRef);

  readonly modalConfig: MovementModalConfig = {
    modalClass: 'modal--reception',
    icon: 'archive-outline',
    idPrefix: 'reception',
    title: 'Nueva Recepción',
    warehouseSectionLabel: 'Almacén de destino',
    locationLabel: 'Ubicación *',
    locationRequiredAlert: 'Selecciona una ubicación de destino',
    linesLabel: 'Líneas de recepción',
    notesPlaceholder: 'Albarán, referencia...',
    submitLabel: 'Registrar recepción',
    successTitle: 'Recepción registrada',
    csvFilename: 'recepcion',
    csvLocationHeader: 'Ubicación destino',
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
    addIcons({ addOutline, barcodeOutline, downloadOutline });
  }

  ngOnInit() {
    this.list.load();
  }

  exportCsv() {
    this.stockService
      .getAll({
        type: 'INBOUND',
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
        this.csvExport.export('recepciones', headers, rows);
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
        type: 'INBOUND',
        quantity: line.quantity,
        toLocationId: data.locationId,
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
            err?.error?.message ?? 'Error al registrar la recepción',
          );
        },
      });
  }
}

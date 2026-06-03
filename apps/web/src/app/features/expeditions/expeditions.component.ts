import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { addOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { StockService } from '../../core/services/stock.service';
import { CreateMovementDto } from '../../core/models/stock.models';
import { ExpeditionsListState } from './expeditions-list-state';
import { ExpeditionFiltersComponent } from './expedition-filters/expedition-filters.component';
import { ExpeditionListComponent } from './expedition-list/expedition-list.component';
import {
  CreateExpeditionModalComponent,
  ExpeditionSubmitData,
} from './create-expedition-modal/create-expedition-modal.component';

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
    CreateExpeditionModalComponent,
  ],
  templateUrl: './expeditions.component.html',
  styleUrl: './expeditions.component.scss',
})
export class ExpeditionsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly formError = signal('');
  readonly showModal = signal(false);
  readonly list = new ExpeditionsListState(this.stockService, this.destroyRef);

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
    addIcons({ addOutline });
  }

  ngOnInit() {
    this.list.load();
  }

  openModal() {
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onSubmit(data: ExpeditionSubmitData) {
    this.saving.set(true);
    this.formError.set('');

    const requests = data.lines.map((line) => {
      const dto: CreateMovementDto = {
        productId: line.productId,
        warehouseId: data.warehouseId,
        type: 'OUTBOUND',
        quantity: line.quantity,
        fromLocationId: data.fromLocationId,
        notes: line.notes || undefined,
      };
      return this.stockService.create(dto);
    });

    forkJoin(requests)
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
            err?.error?.message ?? 'Error al registrar la expedición',
          );
        },
      });
  }
}

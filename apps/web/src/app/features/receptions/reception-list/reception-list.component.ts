import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  archiveOutline,
  arrowDownOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { StockMovement } from '../../../core/models/stock.models';

@Component({
  selector: 'app-reception-list',
  standalone: true,
  imports: [DatePipe, IonIcon, IonSpinner],
  templateUrl: './reception-list.component.html',
  styleUrl: './reception-list.component.scss',
})
export class ReceptionListComponent {
  readonly receptions = input.required<StockMovement[]>();
  readonly loading = input.required<boolean>();
  readonly hasActiveFilters = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChanged = output<number>();

  readonly emptyMessage = computed(() =>
    this.hasActiveFilters()
      ? 'Prueba con otros filtros'
      : 'Aún no hay recepciones registradas',
  );

  constructor() {
    addIcons({
      archiveOutline,
      arrowDownOutline,
      chevronBackOutline,
      chevronForwardOutline,
    });
  }

  stockDelta(m: StockMovement): string {
    return `${m.previousStock} → ${m.newStock}`;
  }
}

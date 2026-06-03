import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  chevronBackOutline,
  chevronForwardOutline,
  sendOutline,
} from 'ionicons/icons';
import { StockMovement } from '../../../core/models/stock.models';

@Component({
  selector: 'app-expedition-list',
  standalone: true,
  imports: [DatePipe, IonIcon, IonSpinner],
  templateUrl: './expedition-list.component.html',
  styleUrl: './expedition-list.component.scss',
})
export class ExpeditionListComponent {
  readonly expeditions = input.required<StockMovement[]>();
  readonly loading = input.required<boolean>();
  readonly hasActiveFilters = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChanged = output<number>();

  readonly emptyMessage = computed(() =>
    this.hasActiveFilters()
      ? 'Prueba con otros filtros'
      : 'Aún no hay expediciones registradas',
  );

  constructor() {
    addIcons({ arrowUpOutline, chevronBackOutline, chevronForwardOutline, sendOutline });
  }

  stockDelta(m: StockMovement): string {
    return `${m.previousStock} → ${m.newStock}`;
  }
}

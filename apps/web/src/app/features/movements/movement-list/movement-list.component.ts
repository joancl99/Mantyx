import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowDownOutline,
  arrowUpOutline,
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline,
  refreshOutline,
  returnDownBackOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { MovementType, StockMovement } from '../../../core/models/stock.models';
import { MOVEMENT_TYPE_CONFIG } from '../movement-types';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IonIcon, IonSpinner],
  templateUrl: './movement-list.component.html',
  styleUrl: './movement-list.component.scss',
})
export class MovementListComponent {
  readonly movements = input.required<StockMovement[]>();
  readonly loading = input.required<boolean>();
  readonly hasActiveFilters = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChanged = output<number>();

  readonly emptyMessage = computed(() =>
    this.hasActiveFilters()
      ? 'Prueba con otros filtros'
      : 'AÃºn no hay movimientos registrados',
  );

  constructor() {
    addIcons({
      arrowDownOutline,
      arrowUpOutline,
      chevronBackOutline,
      chevronForwardOutline,
      documentTextOutline,
      refreshOutline,
      returnDownBackOutline,
      swapHorizontalOutline,
    });
  }

  typeLabel(type: MovementType): string {
    return MOVEMENT_TYPE_CONFIG[type]?.label ?? type;
  }

  typeCssClass(type: MovementType): string {
    return MOVEMENT_TYPE_CONFIG[type]?.cssClass ?? '';
  }

  typeIcon(type: MovementType): string {
    return MOVEMENT_TYPE_CONFIG[type]?.icon ?? 'document-text-outline';
  }

  quantityDisplay(movement: StockMovement): string {
    if (movement.type === 'OUTBOUND') return `-${movement.quantity}`;
    if (movement.type === 'INBOUND' || movement.type === 'RETURN') {
      return `+${movement.quantity}`;
    }
    return String(movement.quantity);
  }

  stockDelta(movement: StockMovement): string {
    return `${movement.previousStock} â†’ ${movement.newStock}`;
  }
}

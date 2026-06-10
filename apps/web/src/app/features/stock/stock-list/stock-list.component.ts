import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  layersOutline,
  warningOutline,
} from 'ionicons/icons';
import { StockOverviewItem } from '../../../core/models/stock.models';

type StockStatus = 'ok' | 'low' | 'empty';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent {
  readonly items = input.required<StockOverviewItem[]>();
  readonly loading = input.required<boolean>();
  readonly filterLowStock = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  constructor() {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      layersOutline,
      warningOutline,
    });
  }

  stockStatus(item: StockOverviewItem): StockStatus {
    if (item.totalStock === 0) return 'empty';
    if (item.totalStock <= item.minStock) return 'low';
    return 'ok';
  }
}

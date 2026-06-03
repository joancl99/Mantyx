import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  layersOutline,
  locationOutline,
  warningOutline,
} from 'ionicons/icons';
import { StockLocationEntry, StockOverviewItem } from '../../../core/models/stock.models';
import { StockService } from '../../../core/services/stock.service';

@Component({
  selector: 'app-stock-query-list',
  standalone: true,
  imports: [IonIcon, IonSpinner],
  templateUrl: './stock-query-list.component.html',
  styleUrl: './stock-query-list.component.scss',
})
export class StockQueryListComponent {
  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<StockOverviewItem[]>();
  readonly loading = input.required<boolean>();
  readonly hasSearch = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChanged = output<number>();

  readonly expandedId = signal<string | null>(null);
  readonly expandedEntries = signal<StockLocationEntry[]>([]);
  readonly expandLoading = signal(false);

  constructor() {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronDownOutline,
      chevronForwardOutline,
      chevronUpOutline,
      layersOutline,
      locationOutline,
      warningOutline,
    });
  }

  toggle(productId: string) {
    if (this.expandedId() === productId) {
      this.expandedId.set(null);
      this.expandedEntries.set([]);
      return;
    }
    this.expandedId.set(productId);
    this.expandedEntries.set([]);
    this.expandLoading.set(true);
    this.stockService
      .getStockByProduct(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.expandedEntries.set(res.entries.filter((e) => e.quantity > 0));
          this.expandLoading.set(false);
        },
        error: () => this.expandLoading.set(false),
      });
  }

  stockStatus(item: StockOverviewItem): 'empty' | 'low' | 'ok' {
    if (item.totalStock === 0) return 'empty';
    if (item.totalStock <= item.minStock) return 'low';
    return 'ok';
  }

  locationPath(entry: StockLocationEntry): string {
    const { aisle } = entry.location;
    return `${aisle.zone.warehouse.name} › ${aisle.zone.name} › ${aisle.name}`;
  }
}

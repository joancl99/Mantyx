import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StockMovement } from '../../core/models/stock.models';
import { StockService } from '../../core/services/stock.service';

export class ExpeditionsListState {
  readonly expeditions = signal<StockMovement[]>([]);
  readonly loading = signal(true);
  readonly filterDateFrom = signal('');
  readonly filterDateTo = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  readonly totalLabel = computed(() => {
    const total = this.total();
    return total === 0
      ? 'Sin expediciones'
      : `${total} expedición${total === 1 ? '' : 'es'}`;
  });

  readonly hasActiveFilters = computed(
    () => !!this.filterDateFrom() || !!this.filterDateTo(),
  );

  constructor(
    private readonly stockService: StockService,
    private readonly destroyRef: DestroyRef,
  ) {}

  load() {
    this.loading.set(true);
    this.stockService
      .getAll({
        page: this.currentPage(),
        limit: this.pageSize,
        type: 'OUTBOUND',
        dateFrom: this.filterDateFrom() || undefined,
        dateTo: this.filterDateTo() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.expeditions.set(response.data);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onDateFromFilter(event: Event) {
    this.filterDateFrom.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.load();
  }

  onDateToFilter(event: Event) {
    this.filterDateTo.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.load();
  }

  clearFilters() {
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.load();
  }
}

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
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonTitle,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, searchOutline, warningOutline } from 'ionicons/icons';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { StockOverviewItem } from '../../core/models/stock.models';
import { StockService } from '../../core/services/stock.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { StockListComponent } from './stock-list/stock-list.component';

@Component({
  selector: 'app-stock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonButton,
    IonMenuButton,
    IonTitle,
    IonIcon,
    StockListComponent,
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss',
})
export class StockComponent implements OnInit {
  private readonly stockService = inject(StockService);
  private readonly csvExport = inject(CsvExportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly items = signal<StockOverviewItem[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly filterLowStock = signal(false);
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 30;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  readonly totalLabel = computed(() => {
    const t = this.total();
    const low = this.filterLowStock();
    if (t === 0) return 'Sin resultados';
    return low
      ? `${t} producto${t === 1 ? '' : 's'} con stock bajo`
      : `${t} producto${t === 1 ? '' : 's'}`;
  });

  readonly lowStockCount = computed(
    () => this.items().filter((i) => i.totalStock <= i.minStock).length,
  );

  constructor() {
    addIcons({
      downloadOutline,
      searchOutline,
      warningOutline,
    });
  }

  ngOnInit() {
    this.load();
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.load();
      });
  }

  load() {
    this.loading.set(true);
    this.stockService
      .getOverview({
        search: this.searchQuery() || undefined,
        lowStock: this.filterLowStock() || undefined,
        page: this.currentPage(),
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onToggleLowStock() {
    this.filterLowStock.update((v) => !v);
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.load();
  }

  exportCsv() {
    this.stockService
      .getOverview({
        search: this.searchQuery() || undefined,
        lowStock: this.filterLowStock() || undefined,
        limit: 9999,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const headers = ['Producto', 'SKU', 'Stock Total', 'Stock Mínimo'];
        const rows = res.data.map((i: StockOverviewItem) => [
          i.name,
          i.sku,
          i.totalStock,
          i.minStock,
        ]);
        this.csvExport.export('stock', headers, rows);
      });
  }
}

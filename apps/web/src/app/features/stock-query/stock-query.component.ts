import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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
import { closeOutline, searchOutline } from 'ionicons/icons';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { StockOverviewItem } from '../../core/models/stock.models';
import { StockService } from '../../core/services/stock.service';
import { StockQueryListComponent } from './stock-query-list/stock-query-list.component';

@Component({
  selector: 'app-stock-query',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    StockQueryListComponent,
  ],
  templateUrl: './stock-query.component.html',
  styleUrl: './stock-query.component.scss',
})
export class StockQueryComponent implements OnInit {
  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly items = signal<StockOverviewItem[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 25;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  readonly totalLabel = computed(() => {
    const t = this.total();
    const s = this.search();
    if (t === 0) return s ? 'Sin resultados' : 'Sin productos';
    return `${t} producto${t === 1 ? '' : 's'}`;
  });

  constructor() {
    addIcons({ closeOutline, searchOutline });
  }

  ngOnInit() {
    this.load();
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(1);
        this.load();
      });
  }

  load() {
    this.loading.set(true);
    this.stockService
      .getOverview({
        search: this.search() || undefined,
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

  onSearch(value: string) {
    this.search.set(value);
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.search.set('');
    this.searchSubject.next('');
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.load();
  }
}

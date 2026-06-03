import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Product } from '../../core/models/product.models';
import { ProductsService } from '../../core/services/products.service';

export class ProductsListState {
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly selectedCategory = signal('');
  readonly selectedBrand = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );

  readonly totalLabel = computed(() => {
    const total = this.total();
    return total === 0
      ? 'Sin resultados'
      : `${total} producto${total === 1 ? '' : 's'}`;
  });

  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly productsService: ProductsService,
    private readonly destroyRef: DestroyRef,
  ) {}

  connectSearch() {
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
    this.productsService
      .getAll({
        search: this.searchQuery() || undefined,
        categoryId: this.selectedCategory() || undefined,
        brandId: this.selectedBrand() || undefined,
        page: this.currentPage(),
        limit: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.data);
          this.total.set(response.total);
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

  onCategoryChange(event: Event) {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.load();
  }

  onBrandChange(event: Event) {
    this.selectedBrand.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.load();
  }
}

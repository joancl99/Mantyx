import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  cubeOutline,
  createOutline,
  trashOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  filterOutline,
  checkmarkOutline,
  alertCircleOutline,
  imageOutline,
} from 'ionicons/icons';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProductsService, Product, CreateProductDto } from '../../core/services/products.service';
import { CategoriesService, Category } from '../../core/services/categories.service';
import { BrandsService, Brand } from '../../core/services/brands.service';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
  styleUrl: './products.component.scss',
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly brandsService = inject(BrandsService);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ──────────────────────────────────────────────────────
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('');
  readonly selectedBrand = signal('');
  readonly currentPage = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly totalLabel = computed(() => {
    const t = this.total();
    return t === 0 ? 'Sin resultados' : `${t} producto${t === 1 ? '' : 's'}`;
  });

  // ── Permissions ─────────────────────────────────────────────
  readonly canEdit = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN' || role === 'MANAGER';
  });
  readonly canDelete = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'SUPERADMIN' || role === 'ADMIN';
  });

  // ── Modal ────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly modalMode = signal<ModalMode>('create');
  readonly editingProduct = signal<Product | null>(null);
  readonly submitted = signal(false);
  readonly formError = signal('');

  // ── Delete ───────────────────────────────────────────────────
  readonly deleteTarget = signal<Product | null>(null);

  readonly form = new FormGroup({
    name:        new FormControl('', Validators.required),
    sku:         new FormControl('', Validators.required),
    barcode:     new FormControl(''),
    description: new FormControl(''),
    minStock:    new FormControl(0, [Validators.required, Validators.min(0)]),
    categoryId:  new FormControl('', Validators.required),
    brandId:     new FormControl(''),
  });

  private readonly searchSubject = new Subject<string>();

  constructor() {
    addIcons({
      addOutline, searchOutline, cubeOutline, createOutline, trashOutline,
      closeOutline, chevronBackOutline, chevronForwardOutline, filterOutline,
      checkmarkOutline, alertCircleOutline, imageOutline,
    });
  }

  ngOnInit() {
    this.loadFilters();
    this.loadProducts();

    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadProducts();
    });
  }

  private loadFilters() {
    this.categoriesService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cats => this.categories.set(cats));

    this.brandsService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(brands => this.brands.set(brands));
  }

  loadProducts() {
    this.loading.set(true);
    this.productsService.getAll({
      search: this.searchQuery() || undefined,
      categoryId: this.selectedCategory() || undefined,
      brandId: this.selectedBrand() || undefined,
      page: this.currentPage(),
      limit: this.pageSize,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.products.set(res.data);
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

  onCategoryChange(event: Event) {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.loadProducts();
  }

  onBrandChange(event: Event) {
    this.selectedBrand.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
    this.loadProducts();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadProducts();
  }

  // ── Modal ──────────────────────────────────────────────────────
  openCreate() {
    this.form.reset({ minStock: 0 });
    this.submitted.set(false);
    this.formError.set('');
    this.editingProduct.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(product: Product) {
    this.form.patchValue({
      name:        product.name,
      sku:         product.sku,
      barcode:     product.barcode ?? '',
      description: product.description ?? '',
      minStock:    product.minStock,
      categoryId:  product.category?.id ?? '',
      brandId:     product.brand?.id ?? '',
    });
    this.submitted.set(false);
    this.formError.set('');
    this.editingProduct.set(product);
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitForm() {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');
    const raw = this.form.getRawValue();

    const dto: CreateProductDto = {
      name:        raw.name!,
      sku:         raw.sku!,
      barcode:     raw.barcode || undefined,
      description: raw.description || undefined,
      minStock:    Number(raw.minStock),
      categoryId:  raw.categoryId!,
      brandId:     raw.brandId || undefined,
    };

    const request$ = this.modalMode() === 'create'
      ? this.productsService.create(dto)
      : this.productsService.update(this.editingProduct()!.id, dto);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadProducts();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Error al guardar el producto');
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────
  confirmDelete(product: Product) {
    this.deleteTarget.set(product);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  executeDelete() {
    const product = this.deleteTarget();
    if (!product) return;
    this.saving.set(true);
    this.productsService.delete(product.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.loadProducts();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Error al eliminar');
      },
    });
  }
}

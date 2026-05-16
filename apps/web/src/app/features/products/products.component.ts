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
  template: `
    <ion-content [scrollY]="true" [fullscreen]="true">
      <div class="products-page">

        <!-- ── Header ─────────────────────────────────────────────── -->
        <header class="page-header">
          <div class="page-header__left">
            <h1 class="page-title">Productos</h1>
            <span class="page-subtitle">{{ totalLabel() }}</span>
          </div>
          @if (canEdit()) {
            <button class="btn-primary" (click)="openCreate()">
              <ion-icon name="add-outline" />
              Nuevo producto
            </button>
          }
        </header>

        <!-- ── Filters ────────────────────────────────────────────── -->
        <div class="filters-bar">
          <div class="search-wrap">
            <ion-icon name="search-outline" class="search-icon" />
            <input
              class="search-input"
              type="text"
              placeholder="Buscar por nombre, SKU o código de barras..."
              [value]="searchQuery()"
              (input)="onSearch($event)"
            />
          </div>
          <div class="filter-selects">
            <select class="filter-select" (change)="onCategoryChange($event)">
              <option value="">Todas las categorías</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id" [selected]="selectedCategory() === cat.id">
                  {{ cat.name }}
                </option>
              }
            </select>
            <select class="filter-select" (change)="onBrandChange($event)">
              <option value="">Todas las marcas</option>
              @for (brand of brands(); track brand.id) {
                <option [value]="brand.id" [selected]="selectedBrand() === brand.id">
                  {{ brand.name }}
                </option>
              }
            </select>
          </div>
        </div>

        <!-- ── Products list ──────────────────────────────────────── -->
        @if (loading()) {
          <div class="state-center">
            <ion-spinner name="crescent" class="main-spinner" />
          </div>
        } @else if (products().length === 0) {
          <div class="state-center">
            <div class="empty-icon">
              <ion-icon name="cube-outline" />
            </div>
            <p class="empty-title">Sin productos</p>
            <p class="empty-sub">
              {{ searchQuery() || selectedCategory() || selectedBrand()
                ? 'Prueba con otros filtros'
                : 'Crea el primer producto' }}
            </p>
          </div>
        } @else {
          <div class="product-list">
            @for (product of products(); track product.id) {
              <div class="product-row">
                <div class="product-thumb">
                  @if (product.imageUrl) {
                    <img [src]="product.imageUrl" [alt]="product.name" />
                  } @else {
                    <ion-icon name="cube-outline" />
                  }
                </div>
                <div class="product-info">
                  <span class="product-name">{{ product.name }}</span>
                  <span class="product-sku">{{ product.sku }}</span>
                  <div class="product-tags">
                    @if (product.category) {
                      <span class="tag tag--category">{{ product.category.name }}</span>
                    }
                    @if (product.brand) {
                      <span class="tag tag--brand">{{ product.brand.name }}</span>
                    }
                  </div>
                </div>
                <div class="product-meta">
                  <div class="product-min-stock">
                    <span class="meta-label">Stock mín.</span>
                    <span class="meta-value">{{ product.minStock }}</span>
                  </div>
                </div>
                @if (canEdit()) {
                  <div class="product-actions">
                    <button class="action-btn action-btn--edit" (click)="openEdit(product)" title="Editar">
                      <ion-icon name="create-outline" />
                    </button>
                    @if (canDelete()) {
                      <button class="action-btn action-btn--delete" (click)="confirmDelete(product)" title="Eliminar">
                        <ion-icon name="trash-outline" />
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <button
                class="page-btn"
                [disabled]="currentPage() === 1"
                (click)="goToPage(currentPage() - 1)"
              >
                <ion-icon name="chevron-back-outline" />
              </button>
              <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
              <button
                class="page-btn"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                <ion-icon name="chevron-forward-outline" />
              </button>
            </div>
          }
        }

      </div>
    </ion-content>

    <!-- ── Create / Edit modal ────────────────────────────────────── -->
    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ modalMode() === 'create' ? 'Nuevo producto' : 'Editar producto' }}
            </h2>
            <button class="modal-close" (click)="closeModal()">
              <ion-icon name="close-outline" />
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submitForm()" class="modal-body">
            <div class="form-row">
              <div class="form-field" [class.has-error]="submitted() && form.get('name')?.invalid">
                <label class="form-label">Nombre *</label>
                <input class="form-input" formControlName="name" placeholder="Nike Air Basic" />
                @if (submitted() && form.get('name')?.hasError('required')) {
                  <span class="form-error">Campo obligatorio</span>
                }
              </div>
              <div class="form-field" [class.has-error]="submitted() && form.get('sku')?.invalid">
                <label class="form-label">SKU *</label>
                <input class="form-input" formControlName="sku" placeholder="ZAP-NIK-AIR-42" />
                @if (submitted() && form.get('sku')?.hasError('required')) {
                  <span class="form-error">Campo obligatorio</span>
                }
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Código de barras</label>
                <input class="form-input" formControlName="barcode" placeholder="8412345678901" />
              </div>
              <div class="form-field" [class.has-error]="submitted() && form.get('minStock')?.invalid">
                <label class="form-label">Stock mínimo *</label>
                <input class="form-input" type="number" formControlName="minStock" placeholder="5" min="0" />
                @if (submitted() && form.get('minStock')?.invalid) {
                  <span class="form-error">Número ≥ 0</span>
                }
              </div>
            </div>

            <div class="form-row">
              <div class="form-field" [class.has-error]="submitted() && form.get('categoryId')?.invalid">
                <label class="form-label">Categoría *</label>
                <select class="form-input" formControlName="categoryId">
                  <option value="">Seleccionar categoría</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
                @if (submitted() && form.get('categoryId')?.hasError('required')) {
                  <span class="form-error">Selecciona una categoría</span>
                }
              </div>
              <div class="form-field">
                <label class="form-label">Marca</label>
                <select class="form-input" formControlName="brandId">
                  <option value="">Sin marca</option>
                  @for (brand of brands(); track brand.id) {
                    <option [value]="brand.id">{{ brand.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Descripción</label>
              <textarea class="form-input form-textarea" formControlName="description" rows="3" placeholder="Descripción opcional..."></textarea>
            </div>

            @if (formError()) {
              <div class="form-alert">
                <ion-icon name="alert-circle-outline" />
                {{ formError() }}
              </div>
            }

            <div class="modal-footer">
              <button type="button" class="btn-ghost" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">
                @if (saving()) { <ion-spinner name="crescent" /> }
                @else { {{ modalMode() === 'create' ? 'Crear producto' : 'Guardar cambios' }} }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ── Delete confirm ─────────────────────────────────────────── -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="cancelDelete()">
        <div class="modal modal--sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Eliminar producto</h2>
          </div>
          <div class="modal-body">
            <p class="delete-text">
              ¿Eliminar <strong>{{ deleteTarget()!.name }}</strong>?
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="cancelDelete()">Cancelar</button>
            <button class="btn-danger" [disabled]="saving()" (click)="executeDelete()">
              @if (saving()) { <ion-spinner name="crescent" /> }
              @else { Eliminar }
            </button>
          </div>
        </div>
      </div>
    }
  `,
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

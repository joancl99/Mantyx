import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import {
  Brand,
  Category,
  CreateProductDto,
  Product,
} from '../../core/models/product.models';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { BrandsService } from '../../core/services/brands.service';
import { ProductDeleteModalComponent } from './product-delete-modal/product-delete-modal.component';
import { ProductFiltersComponent } from './product-filters/product-filters.component';
import { ProductFormModalComponent } from './product-form-modal/product-form-modal.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductsListState } from './products-list-state';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    ProductDeleteModalComponent,
    ProductFiltersComponent,
    ProductFormModalComponent,
    ProductListComponent,
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
  readonly categories = signal<Category[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly saving = signal(false);
  readonly list = new ProductsListState(this.productsService, this.destroyRef);

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
    name: new FormControl('', Validators.required),
    sku: new FormControl('', Validators.required),
    barcode: new FormControl(''),
    description: new FormControl(''),
    minStock: new FormControl(0, [Validators.required, Validators.min(0)]),
    categoryId: new FormControl('', Validators.required),
    brandId: new FormControl(''),
  });

  constructor() {
    addIcons({
      addOutline,
    });
  }

  ngOnInit() {
    this.loadFilters();
    this.list.connectSearch();
    this.list.load();
  }

  private loadFilters() {
    this.categoriesService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => this.categories.set(cats));

    this.brandsService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((brands) => this.brands.set(brands));
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
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? '',
      description: product.description ?? '',
      minStock: product.minStock,
      categoryId: product.category?.id ?? '',
      brandId: product.brand?.id ?? '',
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

  submitForm(file: File | null) {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.saving.set(true);
    this.formError.set('');
    const raw = this.form.getRawValue();

    const dto: CreateProductDto = {
      name: raw.name!,
      sku: raw.sku!,
      barcode: raw.barcode || undefined,
      description: raw.description || undefined,
      minStock: Number(raw.minStock),
      categoryId: raw.categoryId!,
      brandId: raw.brandId || undefined,
    };

    const save$ =
      this.modalMode() === 'create'
        ? this.productsService.create(dto)
        : this.productsService.update(this.editingProduct()!.id, dto);

    save$
      .pipe(
        switchMap((product) =>
          file
            ? this.productsService.uploadImage(product.id, file)
            : of(product),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showModal.set(false);
          this.list.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(
            err?.error?.message ?? 'Error al guardar el producto',
          );
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
        this.list.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Error al eliminar');
      },
    });
  }
}

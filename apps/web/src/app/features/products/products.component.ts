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
  styles: [`
    :host { display: contents; }

    /* ── Page layout ─────────────────────────────────────────────── */
    .products-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px 80px;
    }

    /* ── Header ──────────────────────────────────────────────────── */
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--wh-text);
      margin: 0 0 2px;
      letter-spacing: -0.3px;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--wh-text-muted);
    }

    /* ── Buttons ─────────────────────────────────────────────────── */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 10px;
      background: var(--wh-accent);
      color: var(--wh-bg);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
      &:hover { opacity: 0.88; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      ion-icon { font-size: 16px; }
      ion-spinner { --color: var(--wh-bg); width: 16px; height: 16px; }
    }
    .btn-ghost {
      padding: 9px 16px;
      border-radius: 10px;
      background: transparent;
      color: var(--wh-text-muted);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--wh-border);
      cursor: pointer;
      transition: background 0.15s;
      &:hover { background: var(--wh-surface-hover); color: var(--wh-text); }
    }
    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 10px;
      background: var(--wh-danger);
      color: #fff;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
      &:hover { opacity: 0.88; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      ion-spinner { --color: #fff; width: 16px; height: 16px; }
    }

    /* ── Filters ─────────────────────────────────────────────────── */
    .filters-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--wh-text-muted);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      background: var(--wh-surface);
      border: 1px solid var(--wh-border);
      border-radius: 10px;
      color: var(--wh-text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
      &::placeholder { color: var(--wh-text-muted); }
      &:focus { border-color: var(--wh-accent); }
    }
    .filter-selects {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .filter-select {
      padding: 10px 12px;
      background: var(--wh-surface);
      border: 1px solid var(--wh-border);
      border-radius: 10px;
      color: var(--wh-text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s;
      &:focus { border-color: var(--wh-accent); }
    }

    /* ── States ──────────────────────────────────────────────────── */
    .state-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      gap: 12px;
    }
    .main-spinner { --color: var(--wh-accent); width: 36px; height: 36px; }
    .empty-icon {
      width: 64px; height: 64px;
      border-radius: 16px;
      background: var(--wh-surface);
      display: flex; align-items: center; justify-content: center;
      ion-icon { font-size: 28px; color: var(--wh-text-muted); }
    }
    .empty-title { font-size: 16px; font-weight: 600; color: var(--wh-text); margin: 0; }
    .empty-sub { font-size: 13px; color: var(--wh-text-muted); margin: 0; }

    /* ── Product list ────────────────────────────────────────────── */
    .product-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .product-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--wh-surface);
      border: 1px solid var(--wh-border);
      border-radius: 12px;
      transition: border-color 0.15s;
      &:hover { border-color: rgba(245,158,11,0.3); }
    }
    .product-thumb {
      width: 44px; height: 44px;
      border-radius: 10px;
      background: var(--wh-surface-hover);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
      ion-icon { font-size: 20px; color: var(--wh-text-muted); }
    }
    .product-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .product-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--wh-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .product-sku {
      font-size: 11px;
      font-weight: 500;
      color: var(--wh-text-muted);
      font-family: monospace;
    }
    .product-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 2px;
    }
    .tag {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .tag--category {
      background: rgba(59,130,246,0.12);
      color: #3b82f6;
      border: 1px solid rgba(59,130,246,0.2);
    }
    .tag--brand {
      background: rgba(168,85,247,0.12);
      color: #a855f7;
      border: 1px solid rgba(168,85,247,0.2);
    }
    .product-meta {
      display: flex;
      gap: 16px;
      flex-shrink: 0;
    }
    .product-min-stock {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .meta-label { font-size: 10px; color: var(--wh-text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
    .meta-value { font-size: 15px; font-weight: 700; color: var(--wh-text); }
    .product-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .action-btn {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--wh-surface-hover);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      ion-icon { font-size: 15px; }
    }
    .action-btn--edit {
      color: var(--wh-accent);
      &:hover { background: rgba(245,158,11,0.15); }
    }
    .action-btn--delete {
      color: var(--wh-danger);
      &:hover { background: rgba(239,68,68,0.12); }
    }

    /* ── Pagination ──────────────────────────────────────────────── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 24px;
    }
    .page-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      background: var(--wh-surface);
      border: 1px solid var(--wh-border);
      color: var(--wh-text);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      &:hover:not(:disabled) { background: var(--wh-surface-hover); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
      ion-icon { font-size: 16px; }
    }
    .page-info { font-size: 13px; color: var(--wh-text-muted); min-width: 56px; text-align: center; }

    /* ── Modal ───────────────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal {
      background: var(--wh-surface);
      border: 1px solid var(--wh-border);
      border-radius: 16px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      animation: modal-in 0.18s ease;
    }
    .modal--sm { max-width: 380px; }
    @keyframes modal-in {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--wh-border);
    }
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--wh-text);
      margin: 0;
    }
    .modal-close {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--wh-text-muted);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      transition: background 0.15s;
      &:hover { background: var(--wh-surface-hover); color: var(--wh-text); }
    }
    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--wh-border);
      margin-top: 6px;
    }

    /* ── Form ────────────────────────────────────────────────────── */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      &.has-error .form-input { border-color: var(--wh-danger); }
    }
    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--wh-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .form-input {
      padding: 10px 12px;
      background: var(--wh-bg);
      border: 1px solid var(--wh-border);
      border-radius: 8px;
      color: var(--wh-text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
      width: 100%;
      box-sizing: border-box;
      &::placeholder { color: var(--wh-text-muted); }
      &:focus { border-color: var(--wh-accent); }
      option { background: var(--wh-surface); }
    }
    .form-textarea { resize: vertical; min-height: 72px; }
    .form-error {
      font-size: 11px;
      color: var(--wh-danger);
    }
    .form-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 8px;
      color: var(--wh-danger);
      font-size: 13px;
      ion-icon { font-size: 16px; flex-shrink: 0; }
    }

    /* ── Delete confirm ──────────────────────────────────────────── */
    .delete-text {
      font-size: 14px;
      color: var(--wh-text-muted);
      margin: 0;
      line-height: 1.5;
      strong { color: var(--wh-text); }
    }

    /* ── Responsive ──────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .product-meta { display: none; }
      .filter-selects { width: 100%; }
      .filter-select { flex: 1; }
    }
  `],
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

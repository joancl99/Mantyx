import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personAddOutline,
  createOutline,
  powerOutline,
  closeOutline,
  alertCircleOutline,
  searchOutline,
  shieldOutline,
  eyeOutline,
  eyeOffOutline,
  pricetagsOutline,
  storefrontOutline,
  trashOutline,
  addOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, CompanyUser, UserRole } from '../../core/services/users.service';
import { Brand, Category } from '../../core/models/product.models';
import { CategoriesService } from '../../core/services/categories.service';
import { BrandsService } from '../../core/services/brands.service';
import { CompaniesService, CompanyInfo, CreateCompanyDto } from '../../core/services/companies.service';

type AdminTab = 'usuarios' | 'categorias' | 'marcas';

const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  MANAGER: 'Manager',
  OPERATOR: 'Operario',
  VIEWER: 'Solo lectura',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly brandsService = inject(BrandsService);
  private readonly companiesService = inject(CompaniesService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Tab ───────────────────────────────────────────────────────────────────────
  readonly activeTab = signal<AdminTab>('usuarios');

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'SUPERADMIN');

  // ── Users ─────────────────────────────────────────────────────────────────────
  readonly users = signal<CompanyUser[]>([]);
  readonly usersLoading = signal(true);
  readonly userSaving = signal(false);

  readonly userSearch = signal('');
  readonly roleFilter = signal<UserRole | ''>('');

  readonly filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase();
    const role = this.roleFilter();
    return this.users()
      .filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .filter(u => !role || u.role === role);
  });

  readonly totalCount = computed(() => this.users().length);
  readonly activeCount = computed(() => this.users().filter(u => u.isActive).length);
  readonly inactiveCount = computed(() => this.users().filter(u => !u.isActive).length);
  readonly adminCount = computed(() => this.users().filter(u => u.role === 'ADMIN' || u.role === 'MANAGER').length);

  readonly showUserModal = signal(false);
  readonly userModalMode = signal<'create' | 'edit'>('create');
  readonly userEditingId = signal<string | null>(null);
  readonly userSubmitted = signal(false);
  readonly userFormError = signal('');
  readonly showPassword = signal(false);
  readonly toggleTarget = signal<CompanyUser | null>(null);

  readonly userForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    role: new FormControl<UserRole>('OPERATOR', Validators.required),
  });

  readonly assignableRoles: UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'];

  // ── Categories ────────────────────────────────────────────────────────────────
  readonly categories = signal<Category[]>([]);
  readonly catLoading = signal(false);
  readonly catSaving = signal(false);
  readonly catDeleting = signal(false);

  readonly catSearch = signal('');
  readonly filteredCategories = computed(() => {
    const q = this.catSearch().toLowerCase();
    return this.categories().filter(c => !q || c.name.toLowerCase().includes(q));
  });

  readonly showCatModal = signal(false);
  readonly catModalMode = signal<'create' | 'edit'>('create');
  readonly catEditingId = signal<string | null>(null);
  readonly catSubmitted = signal(false);
  readonly catFormError = signal('');
  readonly catDeleteTarget = signal<Category | null>(null);

  readonly catForm = new FormControl('', [Validators.required, Validators.minLength(1)]);

  // ── Brands ────────────────────────────────────────────────────────────────────
  readonly brands = signal<Brand[]>([]);
  readonly brandLoading = signal(false);
  readonly brandSaving = signal(false);
  readonly brandDeleting = signal(false);

  readonly brandSearch = signal('');
  readonly filteredBrands = computed(() => {
    const q = this.brandSearch().toLowerCase();
    return this.brands().filter(b => !q || b.name.toLowerCase().includes(q));
  });

  readonly showBrandModal = signal(false);
  readonly brandModalMode = signal<'create' | 'edit'>('create');
  readonly brandEditingId = signal<string | null>(null);
  readonly brandSubmitted = signal(false);
  readonly brandFormError = signal('');
  readonly brandDeleteTarget = signal<Brand | null>(null);

  readonly brandForm = new FormControl('', [Validators.required, Validators.minLength(1)]);

  // ── Companies (SUPERADMIN) ────────────────────────────────────────────────────
  readonly companies = signal<CompanyInfo[]>([]);
  readonly companiesLoading = signal(false);
  readonly companySaving = signal(false);

  readonly companySearch = signal('');
  readonly filteredCompanies = computed(() => {
    const q = this.companySearch().toLowerCase();
    return this.companies().filter(c => !q || c.name.toLowerCase().includes(q));
  });

  readonly showCompanyModal = signal(false);
  readonly companyModalMode = signal<'create' | 'edit'>('create');
  readonly companyEditingId = signal<string | null>(null);
  readonly companySubmitted = signal(false);
  readonly companyFormError = signal('');
  readonly companyToggleTarget = signal<CompanyInfo | null>(null);

  readonly companyForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    taxId: new FormControl(''),
  });

  constructor() {
    addIcons({
      peopleOutline, personAddOutline, createOutline, powerOutline,
      closeOutline, alertCircleOutline, searchOutline, shieldOutline,
      eyeOutline, eyeOffOutline, pricetagsOutline, storefrontOutline,
      trashOutline, addOutline,
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) {
      this.loadCompanies();
    } else {
      this.loadUsers();
    }
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'categorias' && this.categories().length === 0 && !this.catLoading()) {
      this.loadCategories();
    }
    if (tab === 'marcas' && this.brands().length === 0 && !this.brandLoading()) {
      this.loadBrands();
    }
  }

  // ── Users methods ─────────────────────────────────────────────────────────────
  loadUsers() {
    this.usersLoading.set(true);
    this.usersService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { this.users.set(list); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
    });
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  openCreateUser() {
    this.userForm.reset({ role: 'OPERATOR' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.userSubmitted.set(false);
    this.userFormError.set('');
    this.showPassword.set(false);
    this.userEditingId.set(null);
    this.userModalMode.set('create');
    this.showUserModal.set(true);
  }

  openEditUser(user: CompanyUser) {
    this.userForm.patchValue({ name: user.name, email: user.email, password: '', role: user.role });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userSubmitted.set(false);
    this.userFormError.set('');
    this.showPassword.set(false);
    this.userEditingId.set(user.id);
    this.userModalMode.set('edit');
    this.showUserModal.set(true);
  }

  closeUserModal() { this.showUserModal.set(false); }

  submitUserForm() {
    this.userSubmitted.set(true);
    if (this.userForm.invalid) return;
    this.userSaving.set(true);
    this.userFormError.set('');
    const raw = this.userForm.getRawValue();

    const req$ = this.userModalMode() === 'create'
      ? this.usersService.create({ name: raw.name!, email: raw.email!, password: raw.password!, role: raw.role! })
      : this.usersService.update(this.userEditingId()!, { name: raw.name!, email: raw.email!, role: raw.role! });

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.userSaving.set(false); this.showUserModal.set(false); this.loadUsers(); },
      error: err => {
        this.userSaving.set(false);
        this.userFormError.set(err?.error?.message ?? 'Error al guardar el usuario');
      },
    });
  }

  confirmToggle(user: CompanyUser) { this.toggleTarget.set(user); }
  cancelToggle() { this.toggleTarget.set(null); }

  executeToggle() {
    const user = this.toggleTarget();
    if (!user) return;
    this.userSaving.set(true);
    this.usersService.toggleActive(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.userSaving.set(false); this.toggleTarget.set(null); this.loadUsers(); },
      error: () => { this.userSaving.set(false); this.toggleTarget.set(null); },
    });
  }

  // ── Categories methods ────────────────────────────────────────────────────────
  loadCategories() {
    this.catLoading.set(true);
    this.categoriesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { this.categories.set(list); this.catLoading.set(false); },
      error: () => this.catLoading.set(false),
    });
  }

  openCreateCat() {
    this.catForm.reset('');
    this.catSubmitted.set(false);
    this.catFormError.set('');
    this.catEditingId.set(null);
    this.catModalMode.set('create');
    this.showCatModal.set(true);
  }

  openEditCat(cat: Category) {
    this.catForm.setValue(cat.name);
    this.catSubmitted.set(false);
    this.catFormError.set('');
    this.catEditingId.set(cat.id);
    this.catModalMode.set('edit');
    this.showCatModal.set(true);
  }

  closeCatModal() { this.showCatModal.set(false); }

  submitCatForm() {
    this.catSubmitted.set(true);
    if (this.catForm.invalid) return;
    this.catSaving.set(true);
    this.catFormError.set('');
    const name = this.catForm.value!.trim();

    const req$ = this.catModalMode() === 'create'
      ? this.categoriesService.create(name)
      : this.categoriesService.rename(this.catEditingId()!, name);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.catSaving.set(false); this.showCatModal.set(false); this.loadCategories(); },
      error: err => {
        this.catSaving.set(false);
        this.catFormError.set(err?.error?.message ?? 'Error al guardar la categoría');
      },
    });
  }

  confirmDeleteCat(cat: Category) { this.catDeleteTarget.set(cat); }
  cancelDeleteCat() { this.catDeleteTarget.set(null); }

  executeDeleteCat() {
    const cat = this.catDeleteTarget();
    if (!cat) return;
    this.catDeleting.set(true);
    this.categoriesService.delete(cat.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.catDeleting.set(false); this.catDeleteTarget.set(null); this.loadCategories(); },
      error: err => {
        this.catDeleting.set(false);
        this.catDeleteTarget.set(null);
        this.catFormError.set(err?.error?.message ?? 'Error al eliminar');
      },
    });
  }

  // ── Brands methods ────────────────────────────────────────────────────────────
  loadBrands() {
    this.brandLoading.set(true);
    this.brandsService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { this.brands.set(list); this.brandLoading.set(false); },
      error: () => this.brandLoading.set(false),
    });
  }

  openCreateBrand() {
    this.brandForm.reset('');
    this.brandSubmitted.set(false);
    this.brandFormError.set('');
    this.brandEditingId.set(null);
    this.brandModalMode.set('create');
    this.showBrandModal.set(true);
  }

  openEditBrand(brand: Brand) {
    this.brandForm.setValue(brand.name);
    this.brandSubmitted.set(false);
    this.brandFormError.set('');
    this.brandEditingId.set(brand.id);
    this.brandModalMode.set('edit');
    this.showBrandModal.set(true);
  }

  closeBrandModal() { this.showBrandModal.set(false); }

  submitBrandForm() {
    this.brandSubmitted.set(true);
    if (this.brandForm.invalid) return;
    this.brandSaving.set(true);
    this.brandFormError.set('');
    const name = this.brandForm.value!.trim();

    const req$ = this.brandModalMode() === 'create'
      ? this.brandsService.create(name)
      : this.brandsService.rename(this.brandEditingId()!, name);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.brandSaving.set(false); this.showBrandModal.set(false); this.loadBrands(); },
      error: err => {
        this.brandSaving.set(false);
        this.brandFormError.set(err?.error?.message ?? 'Error al guardar la marca');
      },
    });
  }

  confirmDeleteBrand(brand: Brand) { this.brandDeleteTarget.set(brand); }
  cancelDeleteBrand() { this.brandDeleteTarget.set(null); }

  executeDeleteBrand() {
    const brand = this.brandDeleteTarget();
    if (!brand) return;
    this.brandDeleting.set(true);
    this.brandsService.delete(brand.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.brandDeleting.set(false); this.brandDeleteTarget.set(null); this.loadBrands(); },
      error: err => {
        this.brandDeleting.set(false);
        this.brandDeleteTarget.set(null);
        this.brandFormError.set(err?.error?.message ?? 'Error al eliminar');
      },
    });
  }

  // ── Companies methods (SUPERADMIN) ────────────────────────────────────────────
  loadCompanies() {
    this.companiesLoading.set(true);
    this.companiesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { this.companies.set(list); this.companiesLoading.set(false); },
      error: () => this.companiesLoading.set(false),
    });
  }

  openCreateCompany() {
    this.companyForm.reset();
    this.companySubmitted.set(false);
    this.companyFormError.set('');
    this.companyEditingId.set(null);
    this.companyModalMode.set('create');
    this.showCompanyModal.set(true);
  }

  openEditCompany(c: CompanyInfo) {
    this.companyForm.patchValue({ name: c.name, taxId: c.taxId ?? '' });
    this.companySubmitted.set(false);
    this.companyFormError.set('');
    this.companyEditingId.set(c.id);
    this.companyModalMode.set('edit');
    this.showCompanyModal.set(true);
  }

  closeCompanyModal() { this.showCompanyModal.set(false); }

  submitCompanyForm() {
    this.companySubmitted.set(true);
    if (this.companyForm.invalid) return;
    this.companySaving.set(true);
    this.companyFormError.set('');
    const raw = this.companyForm.getRawValue();
    const dto: CreateCompanyDto = { name: raw.name!, taxId: raw.taxId || undefined };

    const req$ = this.companyModalMode() === 'create'
      ? this.companiesService.create(dto)
      : this.companiesService.update(this.companyEditingId()!, dto);

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.companySaving.set(false); this.showCompanyModal.set(false); this.loadCompanies(); },
      error: err => { this.companySaving.set(false); this.companyFormError.set(err?.error?.message ?? 'Error al guardar'); },
    });
  }

  confirmToggleCompany(c: CompanyInfo) { this.companyToggleTarget.set(c); }
  cancelToggleCompany() { this.companyToggleTarget.set(null); }

  executeToggleCompany() {
    const c = this.companyToggleTarget();
    if (!c) return;
    this.companySaving.set(true);
    this.companiesService.toggleStatus(c.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.companySaving.set(false); this.companyToggleTarget.set(null); this.loadCompanies(); },
      error: () => { this.companySaving.set(false); this.companyToggleTarget.set(null); },
    });
  }

  companyStatusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activa', INACTIVE: 'Inactiva', SUSPENDED: 'Suspendida' };
    return map[status] ?? status;
  }

  companyInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}

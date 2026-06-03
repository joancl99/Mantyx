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
import { CompanyUser, USER_ROLE_LABELS, UserRole } from '../../core/models/user.models';
import { UsersService } from '../../core/services/users.service';
import { Brand, Category } from '../../core/models/product.models';
import { CategoriesService } from '../../core/services/categories.service';
import { BrandsService } from '../../core/services/brands.service';
import { CompanyInfo, CreateCompanyDto } from '../../core/models/company.models';
import { CompaniesService } from '../../core/services/companies.service';
import { AdminCatalogPanelComponent } from './admin-catalog-panel/admin-catalog-panel.component';
import { AdminCatalogState } from './admin-catalog-state';
import { AdminCompanyListComponent } from './admin-company-list/admin-company-list.component';
import { AdminUsersPanelComponent } from './admin-users-panel/admin-users-panel.component';

type AdminTab = 'usuarios' | 'categorias' | 'marcas';

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
    AdminCatalogPanelComponent,
    AdminCompanyListComponent,
    AdminUsersPanelComponent,
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

  readonly categoryCatalog = new AdminCatalogState<Category>(
    this.categoriesService,
    this.destroyRef,
    {
      saveError: 'Error al guardar la categoría',
      deleteError: 'Error al eliminar',
    },
  );

  readonly brandCatalog = new AdminCatalogState<Brand>(
    this.brandsService,
    this.destroyRef,
    {
      saveError: 'Error al guardar la marca',
      deleteError: 'Error al eliminar',
    },
  );

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
    if (tab === 'categorias') this.categoryCatalog.loadIfEmpty();
    if (tab === 'marcas') this.brandCatalog.loadIfEmpty();
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
    return USER_ROLE_LABELS[role] ?? role;
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

}

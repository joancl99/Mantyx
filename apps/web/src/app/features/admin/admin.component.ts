import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  pricetagsOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { AuditService } from '../../core/services/audit.service';
import { UsersService } from '../../core/services/users.service';
import { Brand, Category } from '../../core/models/product.models';
import { CategoriesService } from '../../core/services/categories.service';
import { BrandsService } from '../../core/services/brands.service';
import { CompaniesService } from '../../core/services/companies.service';
import { AdminAuditPanelComponent } from './admin-audit-panel/admin-audit-panel.component';
import { AdminAuditState } from './admin-audit-state';
import { AdminCatalogModalComponent } from './admin-catalog-modal/admin-catalog-modal.component';
import { AdminCatalogPanelComponent } from './admin-catalog-panel/admin-catalog-panel.component';
import { AdminCatalogState } from './admin-catalog-state';
import { AdminCompaniesState } from './admin-companies-state';
import { AdminCompanyListComponent } from './admin-company-list/admin-company-list.component';
import { AdminCompanyModalComponent } from './admin-company-modal/admin-company-modal.component';
import { AdminConfirmDialogComponent } from './admin-confirm-dialog/admin-confirm-dialog.component';
import { AdminUserModalComponent } from './admin-user-modal/admin-user-modal.component';
import { AdminUsersPanelComponent } from './admin-users-panel/admin-users-panel.component';
import { AdminUsersState } from './admin-users-state';

type AdminTab = 'usuarios' | 'categorias' | 'marcas' | 'auditoria';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonIcon,
    AdminAuditPanelComponent,
    AdminCatalogModalComponent,
    AdminCatalogPanelComponent,
    AdminCompanyListComponent,
    AdminCompanyModalComponent,
    AdminConfirmDialogComponent,
    AdminUserModalComponent,
    AdminUsersPanelComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Tab ───────────────────────────────────────────────────────────────────────
  readonly activeTab = signal<AdminTab>('usuarios');

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly isSuperAdmin = computed(
    () => this.auth.currentUser()?.role === 'SUPERADMIN',
  );

  // ── Feature-local orchestration state ───────────────────────────────────────
  readonly users = new AdminUsersState(inject(UsersService), this.destroyRef);
  readonly companies = new AdminCompaniesState(
    inject(CompaniesService),
    this.destroyRef,
  );

  readonly categoryCatalog = new AdminCatalogState<Category>(
    inject(CategoriesService),
    this.destroyRef,
    {
      saveError: 'Error al guardar la categoría',
      deleteError: 'Error al eliminar',
    },
  );

  readonly brandCatalog = new AdminCatalogState<Brand>(
    inject(BrandsService),
    this.destroyRef,
    {
      saveError: 'Error al guardar la marca',
      deleteError: 'Error al eliminar',
    },
  );

  readonly audit = new AdminAuditState(inject(AuditService), this.destroyRef);

  constructor() {
    addIcons({
      peopleOutline,
      pricetagsOutline,
      shieldCheckmarkOutline,
      storefrontOutline,
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin()) {
      this.companies.load();
    } else {
      this.users.load();
    }
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'categorias') this.categoryCatalog.loadIfEmpty();
    if (tab === 'marcas') this.brandCatalog.loadIfEmpty();
    if (tab === 'auditoria') this.audit.loadIfEmpty();
  }
}

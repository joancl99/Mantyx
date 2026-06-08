import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  CompanyUser,
  USER_ROLE_LABELS,
  UserRole,
} from '../../core/models/user.models';
import { UsersService } from '../../core/services/users.service';

/**
 * Users tab orchestration for the ADMIN admin view: list, search/role filters,
 * the summary counts, the create/edit form modal and the activate/deactivate
 * confirmation. Mirrors {@link AdminCatalogState} so `AdminComponent` stays a
 * thin coordinator.
 */
export class AdminUsersState {
  readonly users = signal<CompanyUser[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly search = signal('');
  readonly roleFilter = signal<UserRole | ''>('');

  readonly filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    const role = this.roleFilter();
    return this.users()
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
      .filter((u) => !role || u.role === role);
  });

  readonly totalCount = computed(() => this.users().length);
  readonly activeCount = computed(
    () => this.users().filter((u) => u.isActive).length,
  );
  readonly inactiveCount = computed(
    () => this.users().filter((u) => !u.isActive).length,
  );
  readonly adminCount = computed(
    () =>
      this.users().filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER')
        .length,
  );

  readonly showModal = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly formError = signal('');
  readonly showPassword = signal(false);
  readonly toggleTarget = signal<CompanyUser | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
    ]),
    role: new FormControl<UserRole>('OPERATOR', Validators.required),
  });

  // An ADMIN provisions worker accounts only — never ADMIN/SUPERADMIN.
  readonly assignableRoles: UserRole[] = ['MANAGER', 'OPERATOR', 'VIEWER'];

  constructor(
    private readonly service: UsersService,
    private readonly destroyRef: DestroyRef,
  ) {}

  roleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role] ?? role;
  }

  load() {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.users.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openCreate() {
    this.form.reset({ role: 'OPERATOR' });
    this.form
      .get('password')
      ?.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity();
    this.submitted.set(false);
    this.formError.set('');
    this.showPassword.set(false);
    this.editingId.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(user: CompanyUser) {
    this.form.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.submitted.set(false);
    this.formError.set('');
    this.showPassword.set(false);
    this.editingId.set(user.id);
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

    const req$ =
      this.modalMode() === 'create'
        ? this.service.create({
            name: raw.name!,
            email: raw.email!,
            password: raw.password!,
            role: raw.role!,
          })
        : this.service.update(this.editingId()!, {
            name: raw.name!,
            email: raw.email!,
            role: raw.role!,
          });

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(
          err?.error?.message ?? 'Error al guardar el usuario',
        );
      },
    });
  }

  confirmToggle(user: CompanyUser) {
    this.toggleTarget.set(user);
  }

  cancelToggle() {
    this.toggleTarget.set(null);
  }

  executeToggle() {
    const user = this.toggleTarget();
    if (!user) return;
    this.saving.set(true);
    this.service
      .toggleActive(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toggleTarget.set(null);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.toggleTarget.set(null);
        },
      });
  }
}

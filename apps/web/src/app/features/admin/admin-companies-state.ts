import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompanyInfo } from '../../core/models/company.models';
import { CompaniesService } from '../../core/services/companies.service';

/**
 * Companies tab orchestration for the SUPERADMIN admin view: list, search, the
 * create/edit form modal (with the initial-ADMIN fields only required on
 * create) and the activate/deactivate confirmation. Mirrors
 * {@link AdminCatalogState} so `AdminComponent` stays a thin coordinator.
 */
export class AdminCompaniesState {
  readonly companies = signal<CompanyInfo[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly search = signal('');
  readonly filteredCompanies = computed(() => {
    const q = this.search().toLowerCase();
    return this.companies().filter(
      (c) => !q || c.name.toLowerCase().includes(q),
    );
  });

  readonly showModal = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly formError = signal('');
  readonly toggleTarget = signal<CompanyInfo | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    taxId: new FormControl(''),
    // Initial ADMIN — only required when creating a company (see setAdminValidators).
    adminName: new FormControl(''),
    adminEmail: new FormControl(''),
    adminPassword: new FormControl(''),
  });

  constructor(
    private readonly service: CompaniesService,
    private readonly destroyRef: DestroyRef,
  ) {}

  load() {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.companies.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openCreate() {
    this.form.reset();
    this.setAdminValidators(true);
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(c: CompanyInfo) {
    this.form.reset();
    this.setAdminValidators(false);
    this.form.patchValue({ name: c.name, taxId: c.taxId ?? '' });
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(c.id);
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  // The initial-admin fields only exist when creating a company.
  private setAdminValidators(required: boolean) {
    const { adminName, adminEmail, adminPassword } = this.form.controls;
    adminName.setValidators(
      required ? [Validators.required, Validators.minLength(2)] : [],
    );
    adminEmail.setValidators(
      required ? [Validators.required, Validators.email] : [],
    );
    adminPassword.setValidators(
      required ? [Validators.required, Validators.minLength(8)] : [],
    );
    adminName.updateValueAndValidity();
    adminEmail.updateValueAndValidity();
    adminPassword.updateValueAndValidity();
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
            taxId: raw.taxId || undefined,
            adminName: raw.adminName!,
            adminEmail: raw.adminEmail!,
            adminPassword: raw.adminPassword!,
          })
        : this.service.update(this.editingId()!, {
            name: raw.name!,
            taxId: raw.taxId || undefined,
          });

    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Error al guardar');
      },
    });
  }

  confirmToggle(c: CompanyInfo) {
    this.toggleTarget.set(c);
  }

  cancelToggle() {
    this.toggleTarget.set(null);
  }

  executeToggle() {
    const c = this.toggleTarget();
    if (!c) return;
    this.saving.set(true);
    this.service
      .toggleStatus(c.id)
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

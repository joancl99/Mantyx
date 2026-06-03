import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

interface NamedCatalogItem {
  id: string;
  name: string;
}

interface CatalogService<T extends NamedCatalogItem> {
  getAll(): Observable<T[]>;
  create(name: string): Observable<T>;
  rename(id: string, name: string): Observable<T>;
  delete(id: string): Observable<unknown>;
}

interface CatalogMessages {
  saveError: string;
  deleteError: string;
}

export class AdminCatalogState<T extends NamedCatalogItem> {
  readonly items = signal<T[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly search = signal('');

  readonly filteredItems = computed(() => {
    const query = this.search().toLowerCase();
    return this.items().filter(
      (item) => !query || item.name.toLowerCase().includes(query),
    );
  });

  readonly showModal = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly formError = signal('');
  readonly deleteTarget = signal<T | null>(null);

  readonly form = new FormControl('', [
    Validators.required,
    Validators.minLength(1),
  ]);

  constructor(
    private readonly service: CatalogService<T>,
    private readonly destroyRef: DestroyRef,
    private readonly messages: CatalogMessages,
  ) {}

  load() {
    this.loading.set(true);
    this.service
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadIfEmpty() {
    if (this.items().length === 0 && !this.loading()) {
      this.load();
    }
  }

  openCreate() {
    this.form.reset('');
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  openEdit(item: T) {
    this.form.setValue(item.name);
    this.submitted.set(false);
    this.formError.set('');
    this.editingId.set(item.id);
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

    const name = this.form.value!.trim();
    const request$ =
      this.modalMode() === 'create'
        ? this.service.create(name)
        : this.service.rename(this.editingId()!, name);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(error?.error?.message ?? this.messages.saveError);
      },
    });
  }

  confirmDelete(item: T) {
    this.deleteTarget.set(item);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  executeDelete() {
    const item = this.deleteTarget();
    if (!item) return;

    this.deleting.set(true);
    this.service
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteTarget.set(null);
          this.load();
        },
        error: (error) => {
          this.deleting.set(false);
          this.deleteTarget.set(null);
          this.formError.set(error?.error?.message ?? this.messages.deleteError);
        },
      });
  }
}

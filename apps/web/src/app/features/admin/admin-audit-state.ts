import { computed, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditAction, AuditEntry } from '../../core/models/audit.models';
import { AuditService } from '../../core/services/audit.service';

/**
 * Auditoría tab orchestration for the ADMIN admin view: the company-scoped
 * audit trail with action/entity-type filters and pagination. Mirrors the
 * other feature-local `*-state.ts` classes so `AdminComponent` stays thin.
 */
export class AdminAuditState {
  private readonly limit = 20;

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly currentPage = signal(1);

  readonly actionFilter = signal<AuditAction | ''>('');
  readonly entityTypeFilter = signal('');

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit)),
  );

  readonly hasActiveFilters = computed(
    () => !!this.actionFilter() || !!this.entityTypeFilter(),
  );

  readonly totalLabel = computed(() => {
    const total = this.total();
    return total === 1 ? '1 registro' : `${total} registros`;
  });

  private loaded = false;

  constructor(
    private readonly service: AuditService,
    private readonly destroyRef: DestroyRef,
  ) {}

  loadIfEmpty() {
    if (!this.loaded) this.load();
  }

  load() {
    this.loaded = true;
    this.loading.set(true);
    this.service
      .getAll({
        page: this.currentPage(),
        limit: this.limit,
        action: this.actionFilter() || undefined,
        entityType: this.entityTypeFilter() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.entries.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onActionFilter(event: Event) {
    const value = (event.target as HTMLSelectElement).value as AuditAction | '';
    this.actionFilter.set(value);
    this.currentPage.set(1);
    this.load();
  }

  onEntityTypeFilter(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.entityTypeFilter.set(value);
    this.currentPage.set(1);
    this.load();
  }

  clearFilters() {
    this.actionFilter.set('');
    this.entityTypeFilter.set('');
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }
}

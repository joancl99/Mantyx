import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import {
  AUDIT_ACTION_CLASS,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_TYPES,
  AuditAction,
  AuditEntry,
} from '../../../core/models/audit.models';

@Component({
  selector: 'app-admin-audit-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IonIcon, IonSpinner],
  templateUrl: './admin-audit-panel.component.html',
  styleUrl: './admin-audit-panel.component.scss',
})
export class AdminAuditPanelComponent {
  readonly entries = input.required<AuditEntry[]>();
  readonly loading = input.required<boolean>();
  readonly actionFilter = input.required<AuditAction | ''>();
  readonly entityTypeFilter = input.required<string>();
  readonly hasActiveFilters = input.required<boolean>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalLabel = input.required<string>();

  readonly actionFilterChanged = output<Event>();
  readonly entityTypeFilterChanged = output<Event>();
  readonly filtersCleared = output<void>();
  readonly pageChanged = output<number>();

  readonly actions: AuditAction[] = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
  ];
  readonly entityTypes = AUDIT_ENTITY_TYPES;

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      documentTextOutline,
      shieldCheckmarkOutline,
    });
  }

  actionLabel(action: AuditAction): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  actionClass(action: AuditAction): string {
    return AUDIT_ACTION_CLASS[action] ?? '';
  }

  entityTypeLabel(entityType: string): string {
    return (
      this.entityTypes.find((e) => e.value === entityType)?.label ?? entityType
    );
  }

  changesSummary(entry: AuditEntry): string {
    const changes = entry.changes;
    if (!changes || Object.keys(changes).length === 0) return '';
    return Object.entries(changes)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · ');
  }

  userInitial(entry: AuditEntry): string {
    return entry.user?.name?.charAt(0).toUpperCase() ?? '?';
  }
}

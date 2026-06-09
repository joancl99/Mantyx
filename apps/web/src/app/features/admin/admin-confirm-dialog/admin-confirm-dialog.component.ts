import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';

/**
 * Shared confirmation modal for the admin views: a small dialog with a title,
 * projected body copy and a cancel / confirm action pair. Drives the
 * activate/deactivate confirmations (users, companies) and the catalog delete
 * confirmations (categories, brands). The parent owns visibility via `@if`.
 */
@Component({
  selector: 'app-admin-confirm-dialog',
  standalone: true,
  imports: [IonSpinner],
  templateUrl: './admin-confirm-dialog.component.html',
  styleUrl: './admin-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly danger = input(false);
  readonly loading = input(false);

  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
}

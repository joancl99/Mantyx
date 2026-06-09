import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  closeOutline,
  eyeOffOutline,
  eyeOutline,
} from 'ionicons/icons';
import { AdminUsersState } from '../admin-users-state';

/**
 * Create / edit modal for the ADMIN users tab. Driven by an
 * {@link AdminUsersState}; the password field and its validators only appear in
 * create mode. The parent owns visibility via `@if`.
 */
@Component({
  selector: 'app-admin-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-user-modal.component.html',
  styleUrl: './admin-user-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserModalComponent {
  readonly state = input.required<AdminUsersState>();

  constructor() {
    addIcons({ closeOutline, alertCircleOutline, eyeOutline, eyeOffOutline });
  }
}

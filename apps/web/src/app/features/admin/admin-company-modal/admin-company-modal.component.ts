import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline } from 'ionicons/icons';
import { AdminCompaniesState } from '../admin-companies-state';

/**
 * Create / edit modal for the SUPERADMIN companies tab. Driven by an
 * {@link AdminCompaniesState}; the initial-ADMIN fields only appear in create
 * mode. The parent owns visibility via `@if`.
 */
@Component({
  selector: 'app-admin-company-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-company-modal.component.html',
  styleUrl: './admin-company-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyModalComponent {
  readonly state = input.required<AdminCompaniesState>();

  constructor() {
    addIcons({ closeOutline, alertCircleOutline });
  }
}

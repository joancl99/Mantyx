import {
  ChangeDetectionStrategy,
  Component,
  input,
  Signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline } from 'ionicons/icons';

/**
 * The slice of {@link AdminCatalogState} the modal reads — narrowed to the
 * `T`-free members so any `AdminCatalogState<…>` (category or brand) is
 * assignable regardless of its item type.
 */
export interface CatalogModalState {
  readonly form: FormControl<string>;
  readonly modalMode: Signal<'create' | 'edit'>;
  readonly submitted: Signal<boolean>;
  readonly formError: Signal<string>;
  readonly saving: Signal<boolean>;
  closeModal(): void;
  submitForm(): void;
}

/**
 * Create / rename modal shared by the category and brand catalog tabs. Driven by
 * an `AdminCatalogState`; the per-catalog wording (titles, placeholder, input
 * id) comes in as inputs. The parent owns visibility via `@if`.
 */
@Component({
  selector: 'app-admin-catalog-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-catalog-modal.component.html',
  styleUrl: './admin-catalog-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCatalogModalComponent {
  readonly state = input.required<CatalogModalState>();
  readonly createTitle = input.required<string>();
  readonly editTitle = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly inputId = input.required<string>();

  constructor() {
    addIcons({ closeOutline, alertCircleOutline });
  }
}

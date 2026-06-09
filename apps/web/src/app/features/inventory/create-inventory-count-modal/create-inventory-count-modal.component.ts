import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Warehouse } from '../../../core/models/warehouse.models';

@Component({
  selector: 'app-create-inventory-count-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './create-inventory-count-modal.component.html',
  styleUrl: './create-inventory-count-modal.component.scss',
})
export class CreateInventoryCountModalComponent {
  readonly form = input.required<FormGroup>();
  readonly warehouses = input.required<Warehouse[]>();
  readonly submitted = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<void>();

  constructor() {
    addIcons({ closeOutline });
  }
}

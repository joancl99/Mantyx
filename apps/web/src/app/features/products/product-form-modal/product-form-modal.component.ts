import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline } from 'ionicons/icons';
import { Brand, Category } from '../../../core/models/product.models';

export type ProductFormMode = 'create' | 'edit';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './product-form-modal.component.html',
  styleUrl: './product-form-modal.component.scss',
})
export class ProductFormModalComponent {
  readonly mode = input.required<ProductFormMode>();
  readonly form = input.required<FormGroup>();
  readonly categories = input.required<Category[]>();
  readonly brands = input.required<Brand[]>();
  readonly submitted = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<void>();

  constructor() {
    addIcons({ alertCircleOutline, closeOutline });
  }
}

import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  closeOutline,
  cloudUploadOutline,
  imageOutline,
  trashOutline,
} from 'ionicons/icons';
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
  readonly currentImageUrl = input<string | null>(null);

  readonly closeModal = output<void>();
  readonly submitForm = output<File | null>();

  pendingFile: File | null = null;
  previewUrl: string | null = null;

  constructor() {
    addIcons({
      alertCircleOutline,
      closeOutline,
      cloudUploadOutline,
      imageOutline,
      trashOutline,
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.pendingFile = null;
    this.previewUrl = null;
  }

  get displayImage(): string | null {
    return this.previewUrl ?? this.currentImageUrl();
  }

  submit() {
    this.submitForm.emit(this.pendingFile);
  }
}

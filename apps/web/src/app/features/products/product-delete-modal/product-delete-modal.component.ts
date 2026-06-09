import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { Product } from '../../../core/models/product.models';

@Component({
  selector: 'app-product-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSpinner],
  templateUrl: './product-delete-modal.component.html',
  styleUrl: './product-delete-modal.component.scss',
})
export class ProductDeleteModalComponent {
  readonly product = input.required<Product>();
  readonly saving = input.required<boolean>();

  readonly cancelDelete = output<void>();
  readonly executeDelete = output<void>();
}

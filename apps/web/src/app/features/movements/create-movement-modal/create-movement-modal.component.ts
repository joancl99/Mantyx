import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowDownOutline,
  arrowUpOutline,
  closeOutline,
  returnDownBackOutline,
} from 'ionicons/icons';
import { Product } from '../../../core/models/product.models';
import { MovementType } from '../../../core/models/stock.models';
import { Warehouse } from '../../../core/models/warehouse.models';
import { MovementTypeConfig } from '../movement-types';

@Component({
  selector: 'app-create-movement-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './create-movement-modal.component.html',
  styleUrl: './create-movement-modal.component.scss',
})
export class CreateMovementModalComponent {
  readonly form = input.required<FormGroup>();
  readonly products = input.required<Product[]>();
  readonly warehouses = input.required<Warehouse[]>();
  readonly availableTypes = input.required<MovementType[]>();
  readonly typeConfig = input.required<Record<MovementType, MovementTypeConfig>>();
  readonly submitted = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();

  readonly closeModal = output<void>();
  readonly submitForm = output<void>();

  constructor() {
    addIcons({
      alertCircleOutline,
      arrowDownOutline,
      arrowUpOutline,
      closeOutline,
      returnDownBackOutline,
    });
  }
}

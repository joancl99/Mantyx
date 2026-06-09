import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  createOutline,
  cubeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Product } from '../../../core/models/product.models';

@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent {
  readonly products = input.required<Product[]>();
  readonly loading = input.required<boolean>();
  readonly canEdit = input.required<boolean>();
  readonly canDelete = input.required<boolean>();
  readonly searchQuery = input.required<string>();
  readonly selectedCategory = input.required<string>();
  readonly selectedBrand = input.required<string>();
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly editProduct = output<Product>();
  readonly deleteProduct = output<Product>();
  readonly pageChanged = output<number>();

  readonly hasFilters = computed(
    () =>
      !!(this.searchQuery() || this.selectedCategory() || this.selectedBrand()),
  );

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      createOutline,
      cubeOutline,
      trashOutline,
    });
  }
}

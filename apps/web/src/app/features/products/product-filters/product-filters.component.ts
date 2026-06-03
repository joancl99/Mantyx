import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { Brand, Category } from '../../../core/models/product.models';

@Component({
  selector: 'app-product-filters',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './product-filters.component.html',
  styleUrl: './product-filters.component.scss',
})
export class ProductFiltersComponent {
  readonly searchQuery = input.required<string>();
  readonly selectedCategory = input.required<string>();
  readonly selectedBrand = input.required<string>();
  readonly categories = input.required<Category[]>();
  readonly brands = input.required<Brand[]>();

  readonly searchChanged = output<Event>();
  readonly categoryChanged = output<Event>();
  readonly brandChanged = output<Event>();

  constructor() {
    addIcons({ searchOutline });
  }
}

import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, alertCircleOutline, createOutline, pricetagsOutline, searchOutline, storefrontOutline, trashOutline } from 'ionicons/icons';
import { Brand, Category } from '../../../core/models/product.models';

type CatalogKind = 'category' | 'brand';
type CatalogItem = Category | Brand;

@Component({
  selector: 'app-admin-catalog-panel',
  standalone: true,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-catalog-panel.component.html',
  styleUrl: './admin-catalog-panel.component.scss',
})
export class AdminCatalogPanelComponent {
  readonly kind = input.required<CatalogKind>();
  readonly title = input.required<string>();
  readonly subtitleSingular = input.required<string>();
  readonly subtitlePlural = input.required<string>();
  readonly createLabel = input.required<string>();
  readonly searchPlaceholder = input.required<string>();
  readonly emptyTitle = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly noResultsMessage = input.required<string>();
  readonly items = input.required<CatalogItem[]>();
  readonly loading = input.required<boolean>();
  readonly search = input.required<string>();
  readonly formError = input.required<string>();
  readonly modalOpen = input.required<boolean>();

  readonly searchChange = output<string>();
  readonly createItem = output<void>();
  readonly editItem = output<CatalogItem>();
  readonly deleteItem = output<CatalogItem>();

  constructor() {
    addIcons({ addOutline, alertCircleOutline, createOutline, pricetagsOutline, searchOutline, storefrontOutline, trashOutline });
  }

  iconName(): string {
    return this.kind() === 'category' ? 'pricetags-outline' : 'storefront-outline';
  }
}

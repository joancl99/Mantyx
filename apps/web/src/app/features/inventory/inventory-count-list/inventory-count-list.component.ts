import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  archiveOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { InventoryCount } from '../models/inventory.models';
import { inventoryStatusLabel } from '../inventory-status';

@Component({
  selector: 'app-inventory-count-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner],
  templateUrl: './inventory-count-list.component.html',
  styleUrl: './inventory-count-list.component.scss',
})
export class InventoryCountListComponent {
  readonly counts = input.required<InventoryCount[]>();
  readonly loading = input.required<boolean>();
  readonly selectedCountId = input<string | null>(null);
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly selectCount = output<InventoryCount>();
  readonly pageChange = output<number>();

  constructor() {
    addIcons({ archiveOutline, chevronBackOutline, chevronForwardOutline });
  }

  statusLabel = inventoryStatusLabel;
}

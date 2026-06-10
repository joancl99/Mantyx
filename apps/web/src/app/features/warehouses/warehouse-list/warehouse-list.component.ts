import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  businessOutline,
  chevronForwardOutline,
  createOutline,
  layersOutline,
  locationOutline,
  powerOutline,
} from 'ionicons/icons';
import { Warehouse } from '../../../core/models/warehouse.models';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSpinner],
  templateUrl: './warehouse-list.component.html',
  styleUrl: './warehouse-list.component.scss',
})
export class WarehouseListComponent {
  readonly warehouses = input.required<Warehouse[]>();
  readonly loading = input.required<boolean>();
  readonly canEdit = input.required<boolean>();
  readonly activeCount = input.required<number>();
  readonly totalCount = input.required<number>();

  readonly createWarehouse = output<void>();
  readonly editWarehouse = output<Warehouse>();
  readonly toggleWarehouse = output<Warehouse>();
  readonly manageWarehouse = output<Warehouse>();

  constructor() {
    addIcons({
      addOutline,
      businessOutline,
      chevronForwardOutline,
      createOutline,
      layersOutline,
      locationOutline,
      powerOutline,
    });
  }
}

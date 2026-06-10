import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Warehouse } from '../../../core/models/warehouse.models';
import { InventoryCountStatus } from '../models/inventory.models';

@Component({
  selector: 'app-inventory-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-filters.component.html',
  styleUrl: './inventory-filters.component.scss',
})
export class InventoryFiltersComponent {
  readonly statusOptions =
    input.required<{ value: InventoryCountStatus | ''; label: string }[]>();
  readonly selectedStatus = input.required<InventoryCountStatus | ''>();
  readonly warehouses = input.required<Warehouse[]>();
  readonly selectedWarehouse = input.required<string>();

  readonly statusChange = output<InventoryCountStatus | ''>();
  readonly warehouseChange = output<string>();
}

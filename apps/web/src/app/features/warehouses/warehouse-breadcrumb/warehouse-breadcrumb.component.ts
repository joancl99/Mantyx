import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Aisle, Warehouse, Zone } from '../../../core/models/warehouse.models';

type BreadcrumbTarget = 'warehouses' | 'zones' | 'aisles';
type WarehouseView = BreadcrumbTarget | 'locations';

@Component({
  selector: 'app-warehouse-breadcrumb',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './warehouse-breadcrumb.component.html',
  styleUrl: './warehouse-breadcrumb.component.scss',
})
export class WarehouseBreadcrumbComponent {
  readonly currentView = input.required<WarehouseView>();
  readonly selectedWarehouse = input<Warehouse | null>(null);
  readonly selectedZone = input<Zone | null>(null);
  readonly selectedAisle = input<Aisle | null>(null);

  readonly back = output<void>();
  readonly levelChange = output<BreadcrumbTarget>();

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline });
  }
}

import { Component, input, output } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  chevronForwardOutline,
  createOutline,
  cubeOutline,
  gitBranchOutline,
  layersOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  Aisle,
  Location,
  WarehouseSubLevel,
  Zone,
} from '../../../core/models/warehouse.models';

type SubView = 'zones' | 'aisles' | 'locations';

@Component({
  selector: 'app-warehouse-sublevel-list',
  standalone: true,
  imports: [IonIcon, IonSpinner],
  templateUrl: './warehouse-sublevel-list.component.html',
  styleUrl: './warehouse-sublevel-list.component.scss',
})
export class WarehouseSublevelListComponent {
  readonly view = input.required<SubView>();
  readonly loading = input.required<boolean>();
  readonly canManage = input.required<boolean>();
  readonly canEdit = input.required<boolean>();
  readonly zones = input.required<Zone[]>();
  readonly aisles = input.required<Aisle[]>();
  readonly locations = input.required<Location[]>();
  readonly warehouseName = input<string>('');
  readonly zoneName = input<string>('');
  readonly aisleName = input<string>('');

  readonly createLevel = output<WarehouseSubLevel>();
  readonly editItem = output<{ id: string; value: string; level: WarehouseSubLevel }>();
  readonly deleteItem = output<{ id: string; label: string; level: WarehouseSubLevel }>();
  readonly enterZone = output<Zone>();
  readonly enterAisle = output<Aisle>();

  constructor() {
    addIcons({
      addOutline,
      chevronForwardOutline,
      createOutline,
      cubeOutline,
      gitBranchOutline,
      layersOutline,
      trashOutline,
    });
  }
}

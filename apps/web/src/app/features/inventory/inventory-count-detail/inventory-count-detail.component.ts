import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  listOutline,
  playOutline,
  scanOutline,
  trashOutline,
} from 'ionicons/icons';
import { InventoryCount, InventoryCountLine } from '../models/inventory.models';
import { Aisle, Location, Zone } from '../../../core/models/warehouse.models';
import { inventoryStatusLabel } from '../inventory-status';

@Component({
  selector: 'app-inventory-count-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
  templateUrl: './inventory-count-detail.component.html',
  styleUrl: './inventory-count-detail.component.scss',
})
export class InventoryCountDetailComponent {
  readonly count = input<InventoryCount | null>(null);
  readonly loading = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly formError = input.required<string>();
  readonly lineSubmitted = input.required<boolean>();
  readonly lineForm = input.required<FormGroup>();
  readonly zones = input.required<Zone[]>();
  readonly aisles = input.required<Aisle[]>();
  readonly locations = input.required<Location[]>();

  readonly startCount = output<void>();
  readonly completeCount = output<void>();
  readonly zoneChange = output<string>();
  readonly aisleChange = output<string>();
  readonly scanLocation = output<void>();
  readonly addLine = output<void>();
  readonly updateLine = output<{
    line: InventoryCountLine;
    countedQty: number;
  }>();
  readonly removeLine = output<InventoryCountLine>();

  constructor() {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      listOutline,
      playOutline,
      scanOutline,
      trashOutline,
    });
  }

  statusLabel = inventoryStatusLabel;

  lines() {
    return this.count()?.lines ?? [];
  }

  isReadOnly() {
    return this.count()?.status === 'COMPLETED';
  }

  canStart() {
    return this.count()?.status === 'DRAFT';
  }

  canComplete() {
    return this.count()?.status === 'IN_PROGRESS';
  }

  lineLocationLabel(line: InventoryCountLine) {
    const aisle = line.location.aisle;
    return `${aisle.zone.name} / ${aisle.name} / ${line.location.code}`;
  }

  onCountedQtyChange(line: InventoryCountLine, event: Event) {
    const countedQty = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(countedQty) && countedQty >= 0) {
      this.updateLine.emit({ line, countedQty });
    }
  }
}

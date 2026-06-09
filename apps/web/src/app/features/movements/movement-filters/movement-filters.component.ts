import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { MovementType } from '../../../core/models/stock.models';

@Component({
  selector: 'app-movement-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  templateUrl: './movement-filters.component.html',
  styleUrl: './movement-filters.component.scss',
})
export class MovementFiltersComponent {
  readonly filterType = input.required<MovementType | ''>();
  readonly filterDateFrom = input.required<string>();
  readonly filterDateTo = input.required<string>();
  readonly hasActiveFilters = input.required<boolean>();

  readonly typeChanged = output<Event>();
  readonly dateFromChanged = output<Event>();
  readonly dateToChanged = output<Event>();
  readonly filtersCleared = output<void>();

  constructor() {
    addIcons({ closeOutline });
  }
}

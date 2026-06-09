import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-expedition-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  templateUrl: './expedition-filters.component.html',
  styleUrl: './expedition-filters.component.scss',
})
export class ExpeditionFiltersComponent {
  readonly filterDateFrom = input.required<string>();
  readonly filterDateTo = input.required<string>();
  readonly hasActiveFilters = input.required<boolean>();

  readonly dateFromChanged = output<Event>();
  readonly dateToChanged = output<Event>();
  readonly filtersCleared = output<void>();

  constructor() {
    addIcons({ closeOutline });
  }
}

import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-reception-filters',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './reception-filters.component.html',
  styleUrl: './reception-filters.component.scss',
})
export class ReceptionFiltersComponent {
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

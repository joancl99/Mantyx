import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, powerOutline, searchOutline, shieldOutline } from 'ionicons/icons';
import { CompanyInfo } from '../../../core/models/company.models';

@Component({
  selector: 'app-admin-company-list',
  standalone: true,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-company-list.component.html',
  styleUrl: './admin-company-list.component.scss',
})
export class AdminCompanyListComponent {
  readonly companies = input.required<CompanyInfo[]>();
  readonly loading = input.required<boolean>();
  readonly search = input.required<string>();

  readonly searchChange = output<string>();
  readonly createCompany = output<void>();
  readonly editCompany = output<CompanyInfo>();
  readonly toggleCompany = output<CompanyInfo>();

  constructor() {
    addIcons({ addOutline, createOutline, powerOutline, searchOutline, shieldOutline });
  }

  companyStatusLabel(status: string): string {
    const map: Record<string, string> = { ACTIVE: 'Activa', INACTIVE: 'Inactiva', SUSPENDED: 'Suspendida' };
    return map[status] ?? status;
  }

  companyInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }
}

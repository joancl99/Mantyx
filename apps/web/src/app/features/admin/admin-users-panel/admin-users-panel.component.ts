import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline,
  peopleOutline,
  personAddOutline,
  powerOutline,
  searchOutline,
} from 'ionicons/icons';
import {
  CompanyUser,
  USER_ROLE_LABELS,
  UserRole,
} from '../../../core/models/user.models';

@Component({
  selector: 'app-admin-users-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonIcon, IonSpinner],
  templateUrl: './admin-users-panel.component.html',
  styleUrl: './admin-users-panel.component.scss',
})
export class AdminUsersPanelComponent {
  readonly users = input.required<CompanyUser[]>();
  readonly loading = input.required<boolean>();
  readonly search = input.required<string>();
  readonly roleFilter = input.required<UserRole | ''>();
  readonly roles = input.required<UserRole[]>();
  readonly currentUserId = input.required<string>();
  readonly totalCount = input.required<number>();
  readonly activeCount = input.required<number>();
  readonly inactiveCount = input.required<number>();
  readonly adminCount = input.required<number>();

  readonly searchChange = output<string>();
  readonly roleFilterChange = output<UserRole | ''>();
  readonly createUser = output<void>();
  readonly editUser = output<CompanyUser>();
  readonly toggleUser = output<CompanyUser>();

  constructor() {
    addIcons({
      createOutline,
      peopleOutline,
      personAddOutline,
      powerOutline,
      searchOutline,
    });
  }

  roleLabel(role: UserRole): string {
    return USER_ROLE_LABELS[role] ?? role;
  }

  userInitial(user: CompanyUser): string {
    return user.name.charAt(0).toUpperCase();
  }
}

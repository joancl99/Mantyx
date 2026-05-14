import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonMenu, IonContent, IonIcon, IonRouterOutlet, IonMenuToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  searchOutline,
  cubeOutline,
  archiveOutline,
  arrowUpCircleOutline,
  logOutOutline,
  cubeSharp,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonMenu, IonContent, IonIcon, IonRouterOutlet, IonMenuToggle],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',      icon: 'home-outline',            route: '/app/dashboard'   },
    { label: 'Consulta stock', icon: 'search-outline',          route: '/app/stock-query' },
    { label: 'Inventario',     icon: 'cube-outline',            route: '/app/inventory'   },
    { label: 'Recepciones',    icon: 'archive-outline',         route: '/app/receptions'  },
    { label: 'Expediciones',   icon: 'arrow-up-circle-outline', route: '/app/expeditions' },
  ];

  constructor() {
    addIcons({ homeOutline, searchOutline, cubeOutline, archiveOutline, arrowUpCircleOutline, logOutOutline, cubeSharp });
  }

  logout() {
    this.authService.logout().subscribe();
  }
}

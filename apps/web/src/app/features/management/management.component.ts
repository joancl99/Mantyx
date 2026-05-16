import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
})
export class ManagementComponent {}

import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton],
  templateUrl: './movements.component.html',
  styleUrl: './movements.component.scss',
})
export class MovementsComponent {}

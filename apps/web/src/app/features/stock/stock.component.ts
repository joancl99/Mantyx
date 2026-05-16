import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss',
})
export class StockComponent {}

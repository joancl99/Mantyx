import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent {}

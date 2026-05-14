import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent {}

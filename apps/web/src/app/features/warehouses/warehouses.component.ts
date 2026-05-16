import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>Almacenes</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content></ion-content>
  `,
})
export class WarehousesComponent {}

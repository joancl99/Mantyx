import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, scanOutline } from 'ionicons/icons';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ScannerService } from '../services/scanner.service';

@Component({
  selector: 'app-scanner-overlay',
  standalone: true,
  imports: [IonIcon, IonSpinner],
  templateUrl: './scanner-overlay.component.html',
  styleUrl: './scanner-overlay.component.scss',
})
export class ScannerOverlayComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private readonly scannerService = inject(ScannerService);
  private codeReader: BrowserMultiFormatReader | null = null;
  private controls: { stop: () => void } | null = null;

  loading = true;
  error = '';

  constructor() {
    addIcons({ closeOutline, scanOutline });
  }

  async ngOnInit() {
    this.codeReader = new BrowserMultiFormatReader();
    try {
      this.controls = await this.codeReader.decodeFromVideoDevice(
        undefined,
        this.videoRef.nativeElement,
        (result, err) => {
          if (result) {
            this.loading = false;
            this.scannerService.emitResult({
              value: result.getText(),
              format: result.getBarcodeFormat().toString(),
            });
          } else if (err && (err as Error).name !== 'NotFoundException') {
            this.loading = false;
            this.error = 'Error de cámara. Verifica permisos.';
          }
        },
      );
      this.loading = false;
    } catch {
      this.loading = false;
      this.error = 'No se pudo acceder a la cámara.';
    }
  }

  ngOnDestroy() {
    this.controls?.stop();
    this.codeReader = null;
  }

  cancel() {
    this.scannerService.emitResult(null);
  }
}

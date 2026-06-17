import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, finalize, from, map, take } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';
import { AppConfigService } from './app-config.service';

export interface ScanResult {
  value: string;
  format: string;
}

@Injectable({ providedIn: 'root' })
export class ScannerService {
  private readonly router = inject(Router);
  private readonly appConfig = inject(AppConfigService);

  readonly showOverlay = signal(false);
  private readonly resultSubject = new Subject<ScanResult | null>();

  /**
   * Whether the toolbar scanner button should show for the module of the
   * current route — i.e. the build config keeps `scanner: true` for it. Read
   * by each page's toolbar `@if`.
   */
  isEnabledHere(): boolean {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    const id = segments[0] === 'app' ? segments[1] : undefined;
    return id ? this.appConfig.isScannerEnabled(id) : false;
  }

  scan(): Observable<ScanResult | null> {
    if (Capacitor.isNativePlatform()) {
      return this.scanNative();
    }
    return this.scanWeb();
  }

  /**
   * Fire-and-forget trigger for the global toolbar scanner button. The scan
   * completes after one read (native) or when the overlay emits/closes (web).
   */
  open(): void {
    this.scan().subscribe();
  }

  private scanNative(): Observable<ScanResult | null> {
    return from(
      BarcodeScanner.scan({
        formats: [
          BarcodeFormat.QrCode,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.DataMatrix,
        ],
      }),
    ).pipe(
      map(({ barcodes }) => {
        const first = barcodes.find((b) => b.rawValue);
        if (!first?.rawValue) return null;
        return { value: first.rawValue, format: String(first.format) };
      }),
    );
  }

  private scanWeb(): Observable<ScanResult | null> {
    this.showOverlay.set(true);
    return this.resultSubject.asObservable().pipe(
      take(1),
      finalize(() => this.showOverlay.set(false)),
    );
  }

  emitResult(result: ScanResult | null) {
    this.resultSubject.next(result);
  }
}

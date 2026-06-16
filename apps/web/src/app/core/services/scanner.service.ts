import { Injectable, signal } from '@angular/core';
import { Observable, Subject, finalize, from, map, take } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';

export interface ScanResult {
  value: string;
  format: string;
}

@Injectable({ providedIn: 'root' })
export class ScannerService {
  readonly showOverlay = signal(false);
  private readonly resultSubject = new Subject<ScanResult | null>();

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

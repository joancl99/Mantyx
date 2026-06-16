import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { vi } from 'vitest';
import { ScanResult, ScannerService } from './scanner.service';
import { AppConfigService } from './app-config.service';

/**
 * Covers the web scan flow (ZXing overlay + result subject). The native
 * branch delegates to the ML Kit Capacitor plugin and is exercised on
 * device — here we only pin the platform dispatch to the web path.
 */
describe('ScannerService (web)', () => {
  let service: ScannerService;

  beforeEach(() => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AppConfigService,
          useValue: {
            isModuleActive: () => true,
            isScannerEnabled: () => true,
          },
        },
      ],
    });
    service = TestBed.inject(ScannerService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the overlay while a web scan is pending', () => {
    expect(service.showOverlay()).toBe(false);

    service.scan().subscribe();

    expect(service.showOverlay()).toBe(true);
  });

  it('delivers the first result, completes, and hides the overlay', () => {
    const results: (ScanResult | null)[] = [];
    let completed = false;

    service.scan().subscribe({
      next: (r) => results.push(r),
      complete: () => (completed = true),
    });
    service.emitResult({ value: 'LOC-01', format: 'QR_CODE' });
    // A second emission must not reach the settled subscriber (take(1)).
    service.emitResult({ value: 'LOC-02', format: 'QR_CODE' });

    expect(results).toEqual([{ value: 'LOC-01', format: 'QR_CODE' }]);
    expect(completed).toBe(true);
    expect(service.showOverlay()).toBe(false);
  });

  it('propagates a cancelled scan as null and hides the overlay', () => {
    const results: (ScanResult | null)[] = [];

    service.scan().subscribe((r) => results.push(r));
    service.emitResult(null);

    expect(results).toEqual([null]);
    expect(service.showOverlay()).toBe(false);
  });

  it('supports consecutive scans on the same service instance', () => {
    const results: (ScanResult | null)[] = [];

    service.scan().subscribe((r) => results.push(r));
    service.emitResult({ value: 'first', format: 'QR_CODE' });

    service.scan().subscribe((r) => results.push(r));
    expect(service.showOverlay()).toBe(true);
    service.emitResult({ value: 'second', format: 'QR_CODE' });

    expect(results.map((r) => r?.value)).toEqual(['first', 'second']);
    expect(service.showOverlay()).toBe(false);
  });
});

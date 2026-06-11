import { vi } from 'vitest';
import { CsvExportService } from './csv-export.service';

describe('CsvExportService', () => {
  let service: CsvExportService;
  let capturedBlob: Blob | null;
  let clickSpy: ReturnType<typeof vi.fn>;
  let revokeSpy: ReturnType<typeof vi.fn>;
  let downloadName: string;

  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    service = new CsvExportService();
    capturedBlob = null;
    downloadName = '';

    // jsdom does not implement object URLs — stub them to capture the blob.
    URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:fake-url';
    }) as typeof URL.createObjectURL;
    revokeSpy = vi.fn();
    URL.revokeObjectURL = revokeSpy as typeof URL.revokeObjectURL;
    clickSpy = vi.fn(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      clickSpy as () => void,
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  // jsdom's Blob has no .text(); read it back through FileReader instead.
  function exportedText(): Promise<string> {
    expect(capturedBlob).not.toBeNull();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(capturedBlob as unknown as Blob);
    });
  }

  it('joins headers and rows with CRLF and prepends the UTF-8 BOM', async () => {
    service.export('stock', ['SKU', 'Qty'], [['A-1', 3]]);

    // Read raw bytes: text decoding consumes the BOM, so assert it there.
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(capturedBlob as unknown as Blob);
    });
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(String.fromCharCode(...bytes.slice(3))).toBe('SKU,Qty\r\nA-1,3');
  });

  it('escapes commas, quotes, and newlines per RFC 4180', async () => {
    service.export(
      'movs',
      ['Notes'],
      [['plain'], ['a,b'], ['say "hi"'], ['line1\nline2']],
    );

    const text = await exportedText();
    const lines = text.replace('﻿', '').split('\r\n');
    expect(lines).toEqual([
      'Notes',
      'plain',
      '"a,b"',
      '"say ""hi"""',
      '"line1\nline2"',
    ]);
  });

  it('renders null and undefined cells as empty strings', async () => {
    service.export('rows', ['A', 'B', 'C'], [[null, undefined, 0]]);

    const text = await exportedText();
    expect(text.replace('﻿', '')).toBe('A,B,C\r\n,,0');
  });

  it('downloads as <name>_<YYYY-MM-DD>.csv and revokes the object URL', () => {
    service.export('albaran', ['X'], []);

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(downloadName).toBe(`albaran_${today}.csv`);
    expect(revokeSpy).toHaveBeenCalledWith('blob:fake-url');
  });
});

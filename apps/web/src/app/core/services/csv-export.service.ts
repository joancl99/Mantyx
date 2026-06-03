import { Injectable } from '@angular/core';

type CsvCell = string | number | null | undefined;

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  export(filename: string, headers: string[], rows: CsvCell[][]): void {
    const escape = (cell: CsvCell): string => {
      const str = cell === null || cell === undefined ? '' : String(cell);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ];

    const blob = new Blob(['﻿' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${this.timestamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private timestamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

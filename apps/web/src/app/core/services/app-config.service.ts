import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { AppConfig, ModuleFlags } from '../models/app-config.models';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private modules: Record<string, ModuleFlags> = {};

  /**
   * Loaded once at startup via provideAppInitializer, before any guard runs,
   * from the bundled `/app-config.json`. Fails open: a missing or malformed
   * file leaves every module enabled so a broken config never bricks the app.
   */
  load(): Observable<void> {
    return this.http.get<AppConfig>('/app-config.json').pipe(
      map((cfg) => {
        this.modules = cfg?.modules ?? {};
      }),
      catchError(() => {
        this.modules = {};
        return of(void 0);
      }),
    );
  }

  isModuleActive(id: string): boolean {
    return this.modules[id]?.active ?? true;
  }

  isScannerEnabled(id: string): boolean {
    return this.modules[id]?.scanner ?? true;
  }
}

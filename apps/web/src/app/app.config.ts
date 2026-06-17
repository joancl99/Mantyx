import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { AppConfigService } from './core/services/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Load the build-time feature flags before the app renders, so the menu
    // filter and the module guard see them on the first navigation.
    provideAppInitializer(() => inject(AppConfigService).load()),
    // Restore the session from the refresh cookie before the app renders, so
    // route guards see the correct auth state after a full page reload.
    provideAppInitializer(() => inject(AuthService).bootstrap()),
  ],
};

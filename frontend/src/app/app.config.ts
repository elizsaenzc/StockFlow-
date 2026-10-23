import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors }      from '@angular/common/http';
import { provideAnimationsAsync }                   from '@angular/platform-browser/animations/async';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS }           from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS }            from '@angular/material/snack-bar';
import { MatPaginatorIntl }                         from '@angular/material/paginator';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { AdaptadorFechaEs }                         from './shared/fechas';
import { provideCharts, withDefaultRegisterables }  from 'ng2-charts';
import { routes }                                   from './app.routes';
import { jwtInterceptor }                           from './core/interceptors/jwt.interceptor';
import { PaginadorEs }                              from './shared/paginador-es';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables()),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 3500, horizontalPosition: 'end', verticalPosition: 'bottom' } },
    { provide: MatPaginatorIntl, useClass: PaginadorEs },
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: AdaptadorFechaEs },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
  ]
};

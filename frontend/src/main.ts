import { registerLocaleData }   from '@angular/common';
import localeEs                 from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent }         from './app/app.component';
import { appConfig }            from './app/app.config';

// Formato español para fechas, números e importes (pipes date, number y currency)
registerLocaleData(localeEs, 'es');

bootstrapApplication(AppComponent, appConfig).catch(e => console.error(e));

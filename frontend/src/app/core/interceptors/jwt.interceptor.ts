import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject }                               from '@angular/core';
import { catchError, throwError }               from 'rxjs';
import { AuthService }                          from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();
  const out   = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(out).pipe(
    catchError((e: HttpErrorResponse) => {
      // Sesión caducada: volver al acceso (salvo en el propio login)
      if (e.status === 401 && !req.url.endsWith('/api/sesion')) auth.cerrarSesion();
      return throwError(() => e);
    })
  );
};

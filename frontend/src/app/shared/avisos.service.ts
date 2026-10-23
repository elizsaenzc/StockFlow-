import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

/** Mensajes breves de confirmación o error (MatSnackBar). */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  constructor(private snack: MatSnackBar) {}

  ok(texto: string) { this.snack.open(texto, 'Cerrar'); }

  error(e: unknown, porDefecto = 'No se pudo completar la operación') {
    const msg = e instanceof HttpErrorResponse
      ? (e.status === 0 ? 'Sin conexión con el servidor' : e.error?.mensaje ?? porDefecto)
      : porDefecto;
    this.snack.open(msg, 'Cerrar', { duration: 6000, panelClass: 'aviso-error' });
  }
}

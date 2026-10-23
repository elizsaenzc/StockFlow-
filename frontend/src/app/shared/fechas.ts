import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Fecha local en formato YYYY-MM-DD para la API (sin pasar por UTC). */
export function aIso(d: Date | null | undefined): string {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adaptador de fechas que además entiende lo que se escribe a mano como dd/mm/aaaa. */
@Injectable()
export class AdaptadorFechaEs extends NativeDateAdapter {
  override parse(valor: unknown, formato?: object): Date | null {
    if (typeof valor === 'string') {
      const m = valor.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      if (m) {
        const anio = Number(m[3].length === 2 ? '20' + m[3] : m[3]);
        const d = new Date(anio, Number(m[2]) - 1, Number(m[1]));
        return isNaN(d.getTime()) ? this.invalid() : d;
      }
    }
    return super.parse(valor, formato);
  }
  override getFirstDayOfWeek() { return 1; }
}

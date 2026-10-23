import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Textos del paginador de Angular Material en español. */
@Injectable()
export class PaginadorEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Filas por página';
  override nextPageLabel     = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel    = 'Primera página';
  override lastPageLabel     = 'Última página';
  override getRangeLabel = (page: number, size: number, length: number) => {
    if (!length) return '0 de 0';
    const start = page * size;
    return `${start + 1} – ${Math.min(start + size, length)} de ${length}`;
  };
}

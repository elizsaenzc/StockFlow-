export interface ColumnaCsv<T> { titulo: string; valor: (fila: T) => unknown; }

/**
 * Descarga un CSV que Excel en español abre directamente: separador «;»,
 * coma decimal y BOM UTF-8 para que respete tildes y eñes.
 */
export function exportarCsv<T>(nombre: string, columnas: ColumnaCsv<T>[], filas: T[]) {
  const celda = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const texto = typeof v === 'number' ? v.toLocaleString('es-ES', { useGrouping: false, maximumFractionDigits: 2 }) : String(v);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const lineas = [columnas.map(c => celda(c.titulo)).join(';'), ...filas.map(f => columnas.map(c => celda(c.valor(f))).join(';'))];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}_${new Date().toLocaleDateString('sv-SE')}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

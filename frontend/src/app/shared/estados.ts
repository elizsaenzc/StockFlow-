/** Etiquetas, iconos y tonos de los estados que devuelve la API. */
export interface Estado { texto: string; icono: string; tono: string; }

export const TIPO_MOVIMIENTO: Record<string, Estado> = {
  entrada: { texto: 'Entrada', icono: 'south_west', tono: 'tone-ok' },
  salida:  { texto: 'Salida',  icono: 'north_east', tono: 'tone-danger' },
  ajuste:  { texto: 'Ajuste',  icono: 'tune',       tono: 'tone-info' },
};

export const ESTADO_PEDIDO: Record<string, Estado> = {
  borrador:  { texto: 'Borrador',          icono: 'edit_note',      tono: 'tone-muted' },
  enviado:   { texto: 'Enviado',           icono: 'local_shipping', tono: 'tone-info' },
  parcial:   { texto: 'Recepción parcial', icono: 'pending',        tono: 'tone-warn' },
  recibido:  { texto: 'Recibido',          icono: 'check_circle',   tono: 'tone-ok' },
  cancelado: { texto: 'Cancelado',         icono: 'cancel',         tono: 'tone-danger' },
};

export function estadoStock(a: { stock: number; stock_minimo: number }): Estado {
  if (a.stock <= 0)             return { texto: 'Sin stock',   icono: 'block',   tono: 'tone-danger' };
  if (a.stock <= a.stock_minimo) return { texto: 'Bajo mínimo', icono: 'warning', tono: 'tone-warn' };
  return { texto: 'Correcto', icono: 'check', tono: 'tone-ok' };
}

export const desconocido = (v: string): Estado => ({ texto: v, icono: 'help', tono: 'tone-muted' });

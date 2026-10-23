import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ApiService }                from '../../core/services/api.service';
import { AuthService }               from '../../core/services/auth.service';

@Component({
  selector: 'sf-orders', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Pedidos de compra</span>
      <div class="topbar-right">
        @if (auth.puedeEditar()) {
          <button class="btn btn-jade" (click)="abrirCrear()">Nuevo pedido</button>
        }
      </div>
    </div>
    <div class="page section-gap">
      <div class="toolbar">
        <select class="sf-input" style="width:auto" [(ngModel)]="filtroEstado" (ngModelChange)="cargar()">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="enviado">Enviado al proveedor</option>
          <option value="parcial">Recepción parcial</option>
          <option value="recibido">Completamente recibido</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <span class="text-sm text-muted">{{ pedidos().length }} pedidos</span>
      </div>

      <div class="card" style="padding:0">
        @if (cargando()) { <div class="spinner-wrap"><div class="spinner"></div></div> }
        @else if (!pedidos().length) { <div class="empty-box">Sin pedidos de compra</div> }
        @else {
          <div class="tbl-wrap">
            <table class="sf-tbl">
              <thead>
                <tr><th>Número</th><th>Proveedor</th><th>Almacén</th><th>Estado</th><th>Líneas</th><th class="text-right">Importe</th><th>Esperado</th><th></th></tr>
              </thead>
              <tbody>
                @for (p of pedidos(); track p.id) {
                  <tr>
                    <td class="mono fw-600" style="color:var(--cobalt)">{{ p.numero_pedido }}</td>
                    <td style="font-weight:500">{{ p.nombre_proveedor }}</td>
                    <td class="text-sm text-muted">{{ p.nombre_almacen ?? '—' }}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span class="status-dot" [class]="claseEstado(p.estado)"></span>
                        <span [class]="'badge ' + badgeEstado(p.estado)">{{ etiquetaEstado(p.estado) }}</span>
                      </div>
                    </td>
                    <td class="text-sm">{{ p.lineas?.length ?? 0 }} artículos</td>
                    <td class="mono text-right fw-600">{{ p.importe_total | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                    <td class="text-sm text-muted">{{ p.fecha_esperada ?? '—' }}</td>
                    <td>
                      <div style="display:flex;gap:5px">
                        <button class="btn btn-ghost btn-sm" (click)="verDetalle(p)">Detalle</button>
                        @if (['enviado','parcial'].includes(p.estado)) {
                          <button class="btn btn-jade btn-sm" (click)="abrirRecepcion(p)">Recibir</button>
                        }
                        @if (auth.puedeEditar() && !['recibido','cancelado'].includes(p.estado)) {
                          <button class="btn btn-danger btn-sm" (click)="confirmarCancelacion(p.id)">Cancelar</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    @if (modal() === 'crear') {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:680px">
          <div class="modal-header">
            <span class="modal-title">Nuevo pedido de compra</span>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body section-gap">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Proveedor *</label>
                <select class="sf-input" [(ngModel)]="nuevoPedido.proveedor_id">
                  <option [value]="null">— Selecciona un proveedor —</option>
                  @for (p of proveedores(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
                </select>
              </div>
              <div class="form-group"><label class="form-label">Almacén de destino</label>
                <select class="sf-input" [(ngModel)]="nuevoPedido.almacen_id">
                  <option [value]="null">— Selecciona almacén —</option>
                  @for (a of almacenes(); track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
                </select>
              </div>
              <div class="form-group"><label class="form-label">Fecha de entrega esperada</label>
                <input class="sf-input" type="date" [(ngModel)]="nuevoPedido.fecha_esperada" />
              </div>
              <div class="form-group"><label class="form-label">Observaciones</label>
                <input class="sf-input" [(ngModel)]="nuevoPedido.notas" placeholder="Notas del pedido..." />
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <span class="card-title">Líneas del pedido</span>
                <button class="btn btn-ghost btn-sm" (click)="agregarLinea()">Añadir línea</button>
              </div>
              @for (linea of nuevoPedido.lineas; track $index) {
                <div style="display:grid;grid-template-columns:1fr 80px 90px 80px 30px;gap:8px;margin-bottom:8px;align-items:center">
                  <select class="sf-input" [(ngModel)]="linea.articulo_id">
                    <option [value]="null">— Artículo —</option>
                    @for (a of articulos(); track a.id) { <option [value]="a.id">{{ a.referencia }} · {{ a.nombre }}</option> }
                  </select>
                  <input class="sf-input" type="number" [(ngModel)]="linea.cantidad" placeholder="Cant." min="1" />
                  <input class="sf-input" type="number" step="0.01" [(ngModel)]="linea.precio_unitario" placeholder="€/ud" />
                  <div class="mono" style="font-size:12px;color:var(--jade)">{{ linea.cantidad * linea.precio_unitario | currency:'EUR':'symbol':'1.2-2':'es' }}</div>
                  <button class="btn btn-danger btn-icon" (click)="quitarLinea($index)">&#10005;</button>
                </div>
              }
              <div style="text-align:right;font-size:14px;font-weight:700;margin-top:8px;color:var(--jade)">
                Total: {{ totalPedido() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="modal.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="guardarPedido()" [disabled]="guardando()">{{ guardando() ? '...' : 'Crear pedido' }}</button>
          </div>
        </div>
      </div>
    }

    @if (modal() === 'detalle' && pedidoSeleccionado()) {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:640px">
          <div class="modal-header">
            <div>
              <span class="modal-title">{{ pedidoSeleccionado()!.numero_pedido }}</span>
              <span [class]="'badge ' + badgeEstado(pedidoSeleccionado()!.estado)" style="margin-left:10px">{{ etiquetaEstado(pedidoSeleccionado()!.estado) }}</span>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body section-gap">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div style="background:var(--ink3);border-radius:8px;padding:12px"><div class="text-sm text-muted">Proveedor</div><div style="font-weight:600;margin-top:2px">{{ pedidoSeleccionado()!.nombre_proveedor }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:12px"><div class="text-sm text-muted">Almacén de destino</div><div style="font-weight:600;margin-top:2px">{{ pedidoSeleccionado()!.nombre_almacen ?? '—' }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:12px"><div class="text-sm text-muted">Fecha esperada</div><div style="font-weight:600;margin-top:2px">{{ pedidoSeleccionado()!.fecha_esperada ?? '—' }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:12px"><div class="text-sm text-muted">Importe total</div><div style="font-weight:700;font-size:16px;color:var(--jade);margin-top:2px">{{ pedidoSeleccionado()!.importe_total | currency:'EUR':'symbol':'1.2-2':'es' }}</div></div>
            </div>
            <div class="tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Referencia</th><th>Artículo</th><th>Pedido</th><th>Recibido</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th></tr></thead>
                <tbody>
                  @for (l of pedidoSeleccionado()!.lineas; track l.id) {
                    <tr>
                      <td class="mono" style="color:var(--cobalt)">{{ l.referencia }}</td>
                      <td>{{ l.nombre_articulo }}</td>
                      <td class="mono">{{ l.cantidad_pedida }} {{ l.unidad }}</td>
                      <td class="mono" [style.color]="l.cantidad_recibida>=l.cantidad_pedida ? 'var(--jade)' : l.cantidad_recibida>0 ? 'var(--amber)' : 'var(--chalk3)'">{{ l.cantidad_recibida }}</td>
                      <td class="mono text-right">{{ l.precio_unitario | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                      <td class="mono text-right fw-600">{{ l.cantidad_pedida * l.precio_unitario | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-ghost" (click)="modal.set(null)">Cerrar</button></div>
        </div>
      </div>
    }

    @if (modal() === 'recepcion' && pedidoSeleccionado()) {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:560px">
          <div class="modal-header">
            <span class="modal-title">Registrar recepción · {{ pedidoSeleccionado()!.numero_pedido }}</span>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body">
            <p style="color:var(--chalk3);font-size:13px;margin-bottom:16px">Indica las cantidades efectivamente recibidas. El stock se actualizará automáticamente al confirmar.</p>
            @for (l of lineasRecepcion; track l.linea_id) {
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;background:var(--ink3);border-radius:8px;padding:10px 14px">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:500">{{ l.nombre_articulo }}</div>
                  <div class="text-sm text-muted">Pedido: {{ l.cantidad_pedida }} · Ya recibido: {{ l.cantidad_recibida }}</div>
                </div>
                <input class="sf-input" type="number" min="0" [max]="l.cantidad_pedida - l.cantidad_recibida"
                       [(ngModel)]="l.cant_ahora" style="width:90px;text-align:center" />
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="modal.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="confirmarRecepcion()" [disabled]="guardando()">{{ guardando() ? '...' : 'Confirmar recepción' }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class OrdersComponent implements OnInit {
  pedidos          = signal<any[]>([]);
  proveedores      = signal<any[]>([]);
  almacenes        = signal<any[]>([]);
  articulos        = signal<any[]>([]);
  cargando         = signal(true);
  guardando        = signal(false);
  modal            = signal<string|null>(null);
  pedidoSeleccionado = signal<any>(null);
  filtroEstado     = '';
  lineasRecepcion: any[] = [];
  nuevoPedido: any = { proveedor_id:null, almacen_id:null, fecha_esperada:'', notas:'', lineas:[] };

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.cargar();
    this.api.listarProveedores().subscribe(p => this.proveedores.set(p));
    this.api.listarAlmacenes().subscribe(a => this.almacenes.set(a));
    this.api.listarArticulos().subscribe(a => this.articulos.set(a));
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarPedidos({ estado: this.filtroEstado }).subscribe({
      next: p => { this.pedidos.set(p); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  abrirCrear() {
    this.nuevoPedido = { proveedor_id:null, almacen_id:null, fecha_esperada:'', notas:'', lineas:[] };
    this.agregarLinea();
    this.modal.set('crear');
  }

  agregarLinea() { this.nuevoPedido.lineas.push({ articulo_id:null, cantidad:1, precio_unitario:0 }); }
  quitarLinea(i: number) { this.nuevoPedido.lineas.splice(i, 1); }
  totalPedido() { return this.nuevoPedido.lineas.reduce((s: number, l: any) => s + (l.cantidad * l.precio_unitario), 0); }

  guardarPedido() {
    if (!this.nuevoPedido.proveedor_id || !this.nuevoPedido.lineas.length) return;
    this.guardando.set(true);
    this.api.crearPedido(this.nuevoPedido).subscribe({
      next: () => { this.modal.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error'); this.guardando.set(false); }
    });
  }

  verDetalle(p: any) { this.pedidoSeleccionado.set(p); this.modal.set('detalle'); }

  abrirRecepcion(p: any) {
    this.pedidoSeleccionado.set(p);
    this.lineasRecepcion = p.lineas.map((l: any) => ({
      linea_id: l.id, nombre_articulo: l.nombre_articulo, referencia: l.referencia, unidad: l.unidad,
      cantidad_pedida: l.cantidad_pedida, cantidad_recibida: l.cantidad_recibida,
      cant_ahora: l.cantidad_pedida - l.cantidad_recibida
    }));
    this.modal.set('recepcion');
  }

  confirmarRecepcion() {
    const p = this.pedidoSeleccionado();
    if (!p) return;
    this.guardando.set(true);
    const payload = { lineas: this.lineasRecepcion.filter(l => l.cant_ahora > 0).map(l => ({ linea_id: l.linea_id, cantidad_recibida: l.cant_ahora })) };
    this.api.recibirPedido(p.id, payload).subscribe({
      next: () => { this.modal.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error'); this.guardando.set(false); }
    });
  }

  confirmarCancelacion(id: number) {
    if (!confirm('¿Cancelar este pedido de compra?')) return;
    this.api.cancelarPedido(id).subscribe(() => this.cargar());
  }

  etiquetaEstado(e: string) { const m: Record<string,string> = { borrador:'Borrador', enviado:'Enviado', parcial:'Recep. parcial', recibido:'Recibido', cancelado:'Cancelado' }; return m[e]??e; }
  badgeEstado(e: string)    { const m: Record<string,string> = { borrador:'badge-muted', enviado:'badge-cobalt', parcial:'badge-amber', recibido:'badge-jade', cancelado:'badge-coral' }; return m[e]??'badge-muted'; }
  claseEstado(e: string)    { return e; }
  cerrarOverlay(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.modal.set(null); }
}

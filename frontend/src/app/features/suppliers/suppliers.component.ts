import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ApiService }                from '../../core/services/api.service';
import { AuthService }               from '../../core/services/auth.service';

@Component({
  selector: 'sf-suppliers', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Proveedores</span>
      <div class="topbar-right">
        @if (auth.puedeEditar()) {
          <button class="btn btn-jade" (click)="abrirCrear()">Nuevo proveedor</button>
        }
      </div>
    </div>
    <div class="page section-gap">
      @if (cargando()) { <div class="spinner-wrap"><div class="spinner"></div></div> }
      @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(295px,1fr));gap:14px">
          @for (p of proveedores(); track p.id) {
            <div class="card" style="cursor:pointer" (click)="verDetalle(p)">
              <div class="card-body" style="padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                  <div>
                    <div style="font-weight:700;font-size:14px;margin-bottom:2px">{{ p.nombre }}</div>
                    @if (p.contacto) { <div class="text-sm text-muted">{{ p.contacto }}</div> }
                  </div>
                  <div [style.background]="colorPuntuacion(p.puntuacion) + '20'"
                       [style.color]="colorPuntuacion(p.puntuacion)"
                       style="padding:3px 9px;border-radius:20px;font-size:12px;font-weight:700;flex-shrink:0">
                    {{ p.puntuacion | number:'1.1-1' }} / 10
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                  @if (p.pais) { <span class="badge badge-muted">{{ p.pais }}</span> }
                  <span class="badge badge-cobalt">{{ p.plazo_entrega }} días de entrega</span>
                  @if (p.condiciones_pago) { <span class="badge badge-muted">{{ p.condiciones_pago }}</span> }
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div style="background:var(--ink3);border-radius:7px;padding:8px 12px">
                    <div class="text-sm text-muted">Artículos</div>
                    <div style="font-weight:700">{{ p.total_articulos ?? 0 }}</div>
                  </div>
                  <div style="background:var(--ink3);border-radius:7px;padding:8px 12px">
                    <div class="text-sm text-muted">Pedidos en curso</div>
                    <div style="font-weight:700" [style.color]="(p.pedidos_abiertos??0)>0?'var(--amber)':'inherit'">{{ p.pedidos_abiertos ?? 0 }}</div>
                  </div>
                </div>
                @if (p.correo || p.telefono) {
                  <div style="display:flex;gap:12px;margin-top:10px;font-size:12px;color:var(--chalk3)">
                    @if (p.correo)   { <span style="overflow:hidden;text-overflow:ellipsis">{{ p.correo }}</span> }
                    @if (p.telefono) { <span style="flex-shrink:0">{{ p.telefono }}</span> }
                  </div>
                }
              </div>
              @if (auth.puedeEditar()) {
                <div style="padding:0 14px 12px;display:flex;gap:8px" (click)="$event.stopPropagation()">
                  <button class="btn btn-ghost btn-sm" (click)="abrirEditar(p)">Editar</button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    @if (modal() === 'crear' || modal() === 'editar') {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:580px">
          <div class="modal-header">
            <span class="modal-title">{{ modal()==='crear' ? 'Nuevo proveedor' : 'Editar · ' + formulario['nombre'] }}</span>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2"><label class="form-label">Razón social *</label><input class="sf-input" [(ngModel)]="formulario['nombre']" /></div>
              <div class="form-group"><label class="form-label">Persona de contacto</label><input class="sf-input" [(ngModel)]="formulario['contacto']" /></div>
              <div class="form-group"><label class="form-label">Correo electrónico</label><input class="sf-input" type="email" [(ngModel)]="formulario['correo']" /></div>
              <div class="form-group"><label class="form-label">Teléfono</label><input class="sf-input" [(ngModel)]="formulario['telefono']" /></div>
              <div class="form-group"><label class="form-label">País</label><input class="sf-input" [(ngModel)]="formulario['pais']" /></div>
              <div class="form-group span-2"><label class="form-label">Dirección</label><input class="sf-input" [(ngModel)]="formulario['direccion']" /></div>
              <div class="form-group"><label class="form-label">Plazo de entrega (días)</label><input class="sf-input" type="number" [(ngModel)]="formulario['plazo_entrega']" /></div>
              <div class="form-group"><label class="form-label">Condiciones de pago</label><input class="sf-input" [(ngModel)]="formulario['condiciones_pago']" placeholder="Pago a 30 días, contado..." /></div>
              <div class="form-group"><label class="form-label">Puntuación (0–10)</label><input class="sf-input" type="number" step="0.1" min="0" max="10" [(ngModel)]="formulario['puntuacion']" /></div>
              <div class="form-group span-2"><label class="form-label">Observaciones</label><textarea class="sf-input" rows="2" [(ngModel)]="formulario['notas']" style="resize:vertical"></textarea></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="modal.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="guardar()" [disabled]="guardando()">{{ guardando() ? '...' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    }

    @if (detalle()) {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:620px">
          <div class="modal-header">
            <span class="modal-title">{{ detalle()!.nombre }}</span>
            <button class="btn btn-ghost btn-icon" (click)="detalle.set(null)">&#10005;</button>
          </div>
          <div class="modal-body section-gap">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">Plazo entrega</div><div style="font-weight:700;margin-top:2px">{{ detalle()!.plazo_entrega }} días</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">Cond. de pago</div><div style="font-weight:700;margin-top:2px">{{ detalle()!.condiciones_pago ?? '—' }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">Puntuación</div><div style="font-weight:700;margin-top:2px;color:{{ colorPuntuacion(detalle()!.puntuacion) }}">{{ detalle()!.puntuacion }} / 10</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">Correo</div><div style="font-weight:600;margin-top:2px;font-size:12px">{{ detalle()!.correo ?? '—' }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">Teléfono</div><div style="font-weight:600;margin-top:2px">{{ detalle()!.telefono ?? '—' }}</div></div>
              <div style="background:var(--ink3);border-radius:8px;padding:10px 14px"><div class="text-sm text-muted">País</div><div style="font-weight:600;margin-top:2px">{{ detalle()!.pais ?? '—' }}</div></div>
            </div>
            @if (detalle()!.articulos?.length) {
              <div>
                <div class="card-title" style="margin-bottom:10px">Artículos suministrados</div>
                <div class="tbl-wrap">
                  <table class="sf-tbl">
                    <thead><tr><th>Referencia</th><th>Artículo</th><th>Stock</th><th class="text-right">Coste</th></tr></thead>
                    <tbody>
                      @for (a of detalle()!.articulos; track a.id) {
                        <tr>
                          <td class="mono" style="color:var(--cobalt)">{{ a.referencia }}</td>
                          <td>{{ a.nombre }}</td>
                          <td class="mono">{{ a.stock }}</td>
                          <td class="mono text-right">{{ a.precio_coste | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
            @if (detalle()!.pedidos?.length) {
              <div>
                <div class="card-title" style="margin-bottom:10px">Historial de pedidos</div>
                <div class="tbl-wrap">
                  <table class="sf-tbl">
                    <thead><tr><th>Número</th><th>Estado</th><th class="text-right">Importe</th><th>Fecha esperada</th></tr></thead>
                    <tbody>
                      @for (pc of detalle()!.pedidos; track pc.id) {
                        <tr>
                          <td class="mono">{{ pc.numero_pedido }}</td>
                          <td><span [class]="'badge ' + badgeEstado(pc.estado)">{{ pc.estado }}</span></td>
                          <td class="mono text-right">{{ pc.importe_total | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                          <td class="text-sm text-muted">{{ pc.fecha_esperada ?? '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
          <div class="modal-footer"><button class="btn btn-ghost" (click)="detalle.set(null)">Cerrar</button></div>
        </div>
      </div>
    }
  `
})
export class SuppliersComponent implements OnInit {
  proveedores = signal<any[]>([]);
  cargando    = signal(true);
  guardando   = signal(false);
  modal       = signal<string|null>(null);
  detalle     = signal<any>(null);
  editandoId: number|null = null;
  formulario: any = {};

  constructor(public auth: AuthService, private api: ApiService) {}
  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.listarProveedores().subscribe({ next: p => { this.proveedores.set(p); this.cargando.set(false); }, error: () => this.cargando.set(false) });
  }

  abrirCrear() {
    this.formulario = { nombre:'', contacto:'', correo:'', telefono:'', direccion:'', pais:'España', plazo_entrega:7, condiciones_pago:'Pago a 30 días', notas:'', puntuacion:7 };
    this.editandoId = null; this.modal.set('crear');
  }
  abrirEditar(p: any) { this.formulario = { ...p }; this.editandoId = p.id; this.modal.set('editar'); }
  verDetalle(p: any) { this.api.obtenerProveedor(p.id).subscribe(d => this.detalle.set(d)); }

  guardar() {
    if (!this.formulario['nombre']) return;
    this.guardando.set(true);
    const req = this.editandoId ? this.api.actualizarProveedor(this.editandoId, this.formulario) : this.api.crearProveedor(this.formulario);
    req.subscribe({
      next: () => { this.modal.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error'); this.guardando.set(false); }
    });
  }

  colorPuntuacion(p: number) { return p >= 8 ? 'var(--jade)' : p >= 6 ? 'var(--amber)' : 'var(--coral)'; }
  badgeEstado(s: string) { const m: Record<string,string> = { borrador:'badge-muted', enviado:'badge-cobalt', parcial:'badge-amber', recibido:'badge-jade', cancelado:'badge-coral' }; return m[s]??'badge-muted'; }
  cerrarOverlay(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) { this.modal.set(null); this.detalle.set(null); } }
}

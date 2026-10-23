import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ApiService }                from '../../core/services/api.service';

@Component({
  selector: 'sf-alerts', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Alertas de stock</span>
      @if (articulos().length) {
        <span class="badge badge-coral" style="font-size:12px">{{ articulos().length }} artículos bajo mínimo</span>
      }
    </div>
    <div class="page section-gap">
      @if (cargando()) { <div class="spinner-wrap"><div class="spinner"></div></div> }
      @else if (!articulos().length) {
        <div class="card empty-box" style="padding:60px">
          <div style="font-size:36px;margin-bottom:8px">&#10003;</div>
          <div style="font-size:15px;font-weight:700">Sin alertas de stock</div>
          <div class="text-muted">Todos los artículos están por encima del nivel mínimo configurado.</div>
        </div>
      } @else {
        @if (sinStock().length) {
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--coral);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
              Sin stock — {{ sinStock().length }} artículos
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
              @for (a of sinStock(); track a.id) { <ng-container [ngTemplateOutlet]="tarjeta" [ngTemplateOutletContext]="{$implicit:a}" /> }
            </div>
          </div>
        }
        @if (stockBajo().length) {
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
              Stock bajo mínimo — {{ stockBajo().length }} artículos
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
              @for (a of stockBajo(); track a.id) { <ng-container [ngTemplateOutlet]="tarjeta" [ngTemplateOutletContext]="{$implicit:a}" /> }
            </div>
          </div>
        }
      }
    </div>

    <ng-template #tarjeta let-a>
      <div class="card" [style.border-color]="a.stock===0 ? 'rgba(255,87,87,.25)' : 'rgba(245,166,35,.2)'">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <div>
              <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:2px">{{ a.nombre }}</div>
              <div class="mono text-muted" style="font-size:10px">{{ a.referencia }}</div>
            </div>
            <span [class]="'badge ' + (a.stock===0 ? 'badge-coral' : 'badge-amber')">
              {{ a.stock===0 ? 'Sin stock' : 'Bajo mínimo' }}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div style="background:var(--ink3);border-radius:7px;padding:9px;text-align:center">
              <div class="text-muted text-sm">Disponible</div>
              <div style="font-size:20px;font-weight:800" [style.color]="a.stock===0 ? 'var(--coral)' : 'var(--amber)'">{{ a.stock }}</div>
              <div class="text-muted text-sm">{{ a.unidad }}</div>
            </div>
            <div style="background:var(--ink3);border-radius:7px;padding:9px;text-align:center">
              <div class="text-muted text-sm">Mínimo</div>
              <div style="font-size:20px;font-weight:800">{{ a.stock_minimo }}</div>
              <div class="text-muted text-sm">{{ a.unidad }}</div>
            </div>
          </div>
          @if (a.nombre_proveedor) { <div class="text-sm text-muted" style="margin-bottom:3px">{{ a.nombre_proveedor }}</div> }
          @if (a.nombre_almacen)   { <div class="text-sm text-muted" style="margin-bottom:10px">{{ a.nombre_almacen }} {{ a.ubicacion ? '· ' + a.ubicacion : '' }}</div> }
          @if (a.punto_reorden) {
            <div class="text-sm" style="color:var(--cobalt);margin-bottom:10px">
              Reorden: pedir {{ a.cant_reorden }} uds. cuando baje de {{ a.punto_reorden }}
            </div>
          }
          <button class="btn btn-jade" style="width:100%;justify-content:center" (click)="abrirReposicion(a)">
            Reponer stock
          </button>
        </div>
      </div>
    </ng-template>

    @if (artReposicion()) {
      <div class="modal-overlay" (click)="artReposicion.set(null)">
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <span class="modal-title">Reponer · {{ artReposicion()?.nombre }}</span>
            <button class="btn btn-ghost btn-icon" (click)="artReposicion.set(null)">&#10005;</button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
            <div class="form-group"><label class="form-label">Cantidad a reponer ({{ artReposicion()?.unidad }})</label>
              <input class="sf-input" type="number" min="1" [(ngModel)]="cantReposicion" />
            </div>
            <div class="form-group"><label class="form-label">Referencia documental</label>
              <input class="sf-input" [(ngModel)]="refReposicion" placeholder="OC-2025-XXX, ALB-2025-XXX..." />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="artReposicion.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="confirmarReposicion()" [disabled]="guardando()">{{ guardando() ? '...' : 'Confirmar entrada' }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class AlertsComponent implements OnInit {
  articulos    = signal<any[]>([]);
  sinStock     = signal<any[]>([]);
  stockBajo    = signal<any[]>([]);
  cargando     = signal(true);
  guardando    = signal(false);
  artReposicion = signal<any>(null);
  cantReposicion = 1;
  refReposicion  = '';

  constructor(private api: ApiService) {}
  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    Promise.all([
      this.api.listarArticulos({ estado_stock:'sin_stock' }).toPromise(),
      this.api.listarArticulos({ estado_stock:'bajo' }).toPromise(),
    ]).then(([ss, sb]) => {
      const todos = [...(ss||[]), ...(sb||[])];
      this.articulos.set(todos);
      this.sinStock.set(ss || []);
      this.stockBajo.set(sb || []);
      this.cargando.set(false);
    }).catch(() => this.cargando.set(false));
  }

  abrirReposicion(a: any) {
    this.artReposicion.set(a);
    this.cantReposicion = Math.max(1, (a.cant_reorden ?? (a.stock_minimo - a.stock + 5)));
    this.refReposicion = '';
  }

  confirmarReposicion() {
    const a = this.artReposicion();
    if (!a) return;
    this.guardando.set(true);
    this.api.registrarMovimiento({
      articulo_id: a.id, tipo: 'entrada', cantidad: this.cantReposicion,
      motivo: 'Reposición por alerta de stock', referencia: this.refReposicion || undefined
    }).subscribe({
      next: () => { this.artReposicion.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error'); this.guardando.set(false); }
    });
  }
}

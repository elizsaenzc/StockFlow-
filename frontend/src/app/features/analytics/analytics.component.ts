import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { ApiService }                from '../../core/services/api.service';

@Component({
  selector: 'sf-analytics', standalone: true, imports: [CommonModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Analíticas e informes</span>
      <span class="text-sm text-muted">Datos de los últimos 90 días</span>
    </div>
    <div class="page section-gap">
      @if (cargando()) { <div class="spinner-wrap"><div class="spinner"></div></div> }
      @else if (datos()) {

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card">
            <div class="card-header"><span class="card-title">Valor de stock por familia</span></div>
            <div class="card-body section-gap" style="gap:10px">
              @for (f of datos()!.valorPorFamilia; track f.nombre) {
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0" [style.background]="f.color"></div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                      <span style="font-size:12px;font-weight:500">{{ f.nombre }}</span>
                      <span class="mono" style="font-size:11px">{{ f.valor_coste | currency:'EUR':'symbol':'1.0-0':'es' }}</span>
                    </div>
                    <div style="height:4px;background:var(--panel2);border-radius:99px;overflow:hidden">
                      <div [style.width]="pctFamilia(f.valor_coste) + '%'"
                           [style.background]="f.color"
                           style="height:100%;border-radius:99px;transition:width .4s">
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">Rendimiento de proveedores</span></div>
            <div class="tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Proveedor</th><th>Puntuación</th><th>Plazo</th><th>Pedidos</th><th class="text-right">Gasto</th></tr></thead>
                <tbody>
                  @for (p of datos()!.rendimientoProveedores; track p.id) {
                    <tr>
                      <td style="font-weight:500;font-size:12px">{{ p.nombre }}</td>
                      <td><span style="font-weight:700" [style.color]="colorPunt(p.puntuacion)">{{ p.puntuacion | number:'1.1-1' }}</span></td>
                      <td class="text-sm text-muted">{{ p.plazo_entrega }}d</td>
                      <td class="text-sm">{{ p.completados }}/{{ p.total_pedidos }}</td>
                      <td class="mono text-right">{{ p.gasto_total | currency:'EUR':'symbol':'1.0-0':'es' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Rotación de artículos (últimos 90 días)</span></div>
          <div class="tbl-wrap">
            <table class="sf-tbl">
              <thead><tr><th>#</th><th>Referencia</th><th>Artículo</th><th>Stock actual</th><th>Salidas 90d</th><th>Entradas 90d</th><th>Movimientos</th><th>Rotación</th></tr></thead>
              <tbody>
                @for (a of datos()!.rotacion; track a.id) {
                  <tr>
                    <td style="font-size:10px;font-weight:800;color:var(--chalk3);text-align:center">{{ $index + 1 }}</td>
                    <td class="mono" style="color:var(--cobalt)">{{ a.referencia }}</td>
                    <td style="font-weight:500">{{ a.nombre }}</td>
                    <td class="mono">{{ a.stock }}</td>
                    <td class="mono" style="color:var(--coral)">{{ a.salidas_90d }}</td>
                    <td class="mono" style="color:var(--jade)">{{ a.entradas_90d }}</td>
                    <td class="mono">{{ a.num_movimientos }}</td>
                    <td>
                      <div style="height:5px;background:var(--panel2);border-radius:99px;width:80px;overflow:hidden">
                        <div [style.width]="pctRotacion(a.num_movimientos) + '%'"
                             style="height:100%;background:var(--cobalt);border-radius:99px">
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (datos()!.stockInmovilizado.length) {
          <div class="card" style="border-color:rgba(245,166,35,.2)">
            <div class="card-header"><span class="card-title" style="color:var(--amber)">Stock inmovilizado (más de 60 días sin movimiento)</span></div>
            <div class="tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Referencia</th><th>Artículo</th><th>Stock</th><th class="text-right">Valor inmovilizado</th><th>Último movimiento</th></tr></thead>
                <tbody>
                  @for (a of datos()!.stockInmovilizado; track a.id) {
                    <tr>
                      <td class="mono" style="color:var(--cobalt)">{{ a.referencia }}</td>
                      <td style="font-weight:500">{{ a.nombre }}</td>
                      <td class="mono">{{ a.stock }}</td>
                      <td class="mono text-right fw-600" style="color:var(--amber)">{{ a.valor_inmovilizado | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                      <td class="text-sm text-muted">{{ a.ultimo_movimiento ? (a.ultimo_movimiento | date:'dd/MM/yy') : 'Sin movimientos' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class AnalyticsComponent implements OnInit {
  datos   = signal<any>(null);
  cargando = signal(true);

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.obtenerAnaliticas().subscribe({
      next: d => { this.datos.set(d); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  maxFamilia() { return Math.max(1, ...(this.datos()?.valorPorFamilia ?? []).map((f: any) => f.valor_coste)); }
  pctFamilia(v: number) { return Math.max(4, Math.round((v / this.maxFamilia()) * 100)); }

  maxMov() { return Math.max(1, ...(this.datos()?.rotacion ?? []).map((r: any) => r.num_movimientos)); }
  pctRotacion(n: number) { return Math.max(4, Math.round((n / this.maxMov()) * 100)); }

  colorPunt(p: number) { return p >= 8 ? 'var(--jade)' : p >= 6 ? 'var(--amber)' : 'var(--coral)'; }
}

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { RouterLink }                from '@angular/router';
import { ApiService }                from '../../core/services/api.service';

@Component({
  selector: 'sf-dashboard', standalone: true, imports: [CommonModule, RouterLink],
  template: `
    <div class="topbar">
      <span class="topbar-title">Panel de control</span>
      <span style="font-size:12px;color:var(--chalk3)">
        {{ hoy | date:'EEEE, d MMMM yyyy':'':'es' }}
      </span>
    </div>

    <div class="page section-gap">
      @if (cargando()) {
        <div class="spinner-wrap"><div class="spinner"></div></div>
      } @else if (datos()) {

        <div class="kpi-grid">
          <div class="kpi cobalt">
            <div class="kpi-label">Artículos en catálogo</div>
            <div class="kpi-value">{{ datos()!.kpis.totalArticulos }}</div>
            <div class="kpi-sub">referencias activas</div>
          </div>
          <div class="kpi coral">
            <div class="kpi-label">Stock crítico</div>
            <div class="kpi-value">{{ datos()!.kpis.stockBajo + datos()!.kpis.sinStock }}</div>
            <div class="kpi-sub">{{ datos()!.kpis.sinStock }} sin stock · {{ datos()!.kpis.stockBajo }} bajo mínimo</div>
          </div>
          <div class="kpi jade">
            <div class="kpi-label">Valor en almacén</div>
            <div class="kpi-value" style="font-size:20px">{{ datos()!.kpis.valorCoste | currency:'EUR':'symbol':'1.0-0':'es' }}</div>
            <div class="kpi-sub">P.V.P. est. {{ datos()!.kpis.valorVenta | currency:'EUR':'symbol':'1.0-0':'es' }}</div>
          </div>
          <div class="kpi amber">
            <div class="kpi-label">Proveedores</div>
            <div class="kpi-value">{{ datos()!.kpis.totalProveedores }}</div>
            <div class="kpi-sub">{{ datos()!.kpis.pedidosAbiertos }} pedidos en curso</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Movimientos hoy</div>
            <div class="kpi-value">{{ datos()!.kpis.movimientosHoy }}</div>
            <div class="kpi-sub">registros del día</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 310px;gap:16px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Actividad últimos 30 días</span>
              <a routerLink="/movimientos" class="btn btn-ghost btn-sm">Ver historial</a>
            </div>
            <div class="card-body">
              <div style="display:flex;align-items:flex-end;gap:3px;height:72px">
                @for (dia of datos()!.graficaMovimientos; track dia.dia) {
                  <div style="flex:1;display:flex;flex-direction:column;gap:2px">
                    <div [style.height]="altoBarra(dia.salidas, maxSalidas()) + 'px'"
                         style="background:var(--coral);border-radius:2px 2px 0 0;min-height:1px;opacity:.8;width:100%">
                    </div>
                    <div [style.height]="altoBarra(dia.entradas, maxEntradas()) + 'px'"
                         style="background:var(--jade);border-radius:0 0 2px 2px;min-height:1px;opacity:.8;width:100%">
                    </div>
                  </div>
                }
              </div>
              <div style="display:flex;gap:16px;margin-top:10px">
                <span style="font-size:11px;color:var(--jade)">Entradas</span>
                <span style="font-size:11px;color:var(--coral)">Salidas</span>
              </div>
            </div>
          </div>

          <div class="card" style="border-color:rgba(255,87,87,.2)">
            <div class="card-header">
              <span class="card-title" style="color:var(--coral)">Stock crítico</span>
              <a routerLink="/alertas" class="btn btn-ghost btn-sm">Ver alertas</a>
            </div>
            <div style="overflow-y:auto;max-height:220px">
              @for (a of datos()!.articulosCriticos; track a.id) {
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line)">
                  <div>
                    <div style="font-size:12px;font-weight:500;line-height:1.3">{{ a.nombre }}</div>
                    <div style="font-size:10px;color:var(--chalk3)">mín. {{ a.stock_minimo }} {{ a.unidad }}</div>
                  </div>
                  <div style="text-align:right;flex-shrink:0">
                    <div style="font-weight:700;font-size:13px"
                         [style.color]="a.stock===0 ? 'var(--coral)' : 'var(--amber)'">
                      {{ a.stock }} {{ a.unidad }}
                    </div>
                  </div>
                </div>
              }
              @if (!datos()!.articulosCriticos.length) {
                <div class="empty-box" style="padding:20px">Todo el stock en niveles correctos</div>
              }
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Últimos movimientos</span>
              <a routerLink="/movimientos" class="btn btn-ghost btn-sm">Ver todos</a>
            </div>
            <div class="tbl-wrap">
              <table class="sf-tbl">
                <thead><tr><th>Artículo</th><th>Tipo</th><th>Cant.</th><th>Resultado</th></tr></thead>
                <tbody>
                  @for (m of datos()!.movimientosRecientes.slice(0,8); track m.id) {
                    <tr>
                      <td>
                        <div style="font-weight:500;font-size:12px">{{ m.nombre_articulo }}</div>
                        <div class="mono text-muted" style="font-size:10px">{{ m.referencia }}</div>
                      </td>
                      <td>
                        <span [class]="etiquetaTipo(m.tipo).clase">{{ etiquetaTipo(m.tipo).texto }}</span>
                      </td>
                      <td class="mono fw-600">{{ m.cantidad }}</td>
                      <td class="mono text-muted" style="font-size:11px">{{ m.stock_antes }} &rarr; {{ m.stock_despues }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="card">
              <div class="card-header"><span class="card-title">Más movidos (30 días)</span></div>
              <div style="padding:12px 16px">
                @for (a of datos()!.masMovidos; track a.id) {
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                    <div style="font-size:10px;font-weight:800;color:var(--chalk3);width:14px;text-align:right;flex-shrink:0">{{ $index + 1 }}</div>
                    <div style="flex:1;min-width:0;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ a.nombre_articulo }}</div>
                    <div class="mono" style="font-size:11px;color:var(--cobalt);font-weight:600;flex-shrink:0">{{ a.num_movimientos }} mov.</div>
                  </div>
                }
              </div>
            </div>

            @if (datos()!.pedidosPendientes.length) {
              <div class="card" style="border-color:rgba(245,166,35,.2)">
                <div class="card-header">
                  <span class="card-title" style="color:var(--amber)">Pedidos en tránsito</span>
                  <a routerLink="/pedidos" class="btn btn-ghost btn-sm">Ver</a>
                </div>
                @for (p of datos()!.pedidosPendientes; track p.id) {
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-bottom:1px solid var(--line)">
                    <div>
                      <div class="mono" style="font-size:11px;font-weight:600">{{ p.numero_pedido }}</div>
                      <div class="text-sm text-muted">{{ p.nombre_proveedor }}</div>
                    </div>
                    <span [class]="'badge ' + (p.estado==='enviado' ? 'badge-cobalt' : 'badge-amber')">{{ p.estado }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  datos   = signal<any>(null);
  cargando = signal(true);
  hoy     = new Date();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.obtenerPanel().subscribe({
      next: d => { this.datos.set(d); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  maxEntradas() { return Math.max(1, ...((this.datos()?.graficaMovimientos ?? []).map((x: any) => x.entradas))); }
  maxSalidas()  { return Math.max(1, ...((this.datos()?.graficaMovimientos ?? []).map((x: any) => x.salidas))); }
  altoBarra(v: number, max: number) { return Math.max(2, Math.round((v / max) * 32)); }

  etiquetaTipo(tipo: string) {
    const mapa: Record<string, {texto: string; clase: string}> = {
      entrada:    { texto: 'Entrada',  clase: 'badge badge-in' },
      salida:     { texto: 'Salida',   clase: 'badge badge-out' },
      ajuste:     { texto: 'Ajuste',   clase: 'badge badge-adjust' },
      transferencia: { texto: 'Transfer.', clase: 'badge badge-cobalt' },
    };
    return mapa[tipo] ?? { texto: tipo, clase: 'badge badge-muted' };
  }
}

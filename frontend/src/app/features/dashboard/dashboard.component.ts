import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe }       from '@angular/common';
import { RouterLink }                                from '@angular/router';
import { MatCardModule }            from '@angular/material/card';
import { MatIconModule }            from '@angular/material/icon';
import { MatButtonModule }          from '@angular/material/button';
import { MatTableModule }           from '@angular/material/table';
import { MatListModule }            from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDialog }                from '@angular/material/dialog';
import { ArticuloDetalleDialog }    from '../products/articulo-detalle.dialog';
import { BaseChartDirective }       from 'ng2-charts';
import { ChartConfiguration }       from 'chart.js';
import { ApiService }               from '../../core/services/api.service';
import { AvisosService }            from '../../shared/avisos.service';
import { ESTADO_PEDIDO, TIPO_MOVIMIENTO, desconocido } from '../../shared/estados';

@Component({
  selector: 'sf-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule,
            MatTableModule, MatListModule, MatProgressSpinnerModule, MatTooltipModule, BaseChartDirective],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Panel de control</h1>
        <span class="sub">{{ hoy | date:'EEEE, d \\'de\\' MMMM \\'de\\' y' }}</span>
      </div>

      @if (cargando()) {
        <div class="cargando"><mat-spinner diameter="40" /></div>
      }
      @if (d(); as d) {
        <div class="stack">
          <div class="kpis">
            <mat-card class="sf-card"><div class="kpi">
              <span class="kpi-icon tone-primary"><mat-icon>inventory_2</mat-icon></span>
              <div><div class="kpi-label">Artículos activos</div><div class="kpi-value">{{ d.kpis.totalArticulos }}</div>
                <div class="kpi-sub">en catálogo</div></div>
            </div></mat-card>
            <mat-card class="sf-card"><div class="kpi">
              <span class="kpi-icon" [class]="d.kpis.sinStock ? 'kpi-icon tone-danger' : 'kpi-icon tone-warn'"><mat-icon>notification_important</mat-icon></span>
              <div><div class="kpi-label">Stock crítico</div><div class="kpi-value">{{ d.kpis.stockBajo + d.kpis.sinStock }}</div>
                <div class="kpi-sub">{{ d.kpis.sinStock }} sin stock · {{ d.kpis.stockBajo }} bajo mínimo</div></div>
            </div></mat-card>
            <mat-card class="sf-card"><div class="kpi">
              <span class="kpi-icon tone-ok"><mat-icon>euro</mat-icon></span>
              <div><div class="kpi-label">Valor en almacén</div><div class="kpi-value">{{ d.kpis.valorCoste | currency:'EUR':'symbol':'1.0-0' }}</div>
                <div class="kpi-sub">PVP estimado {{ d.kpis.valorVenta | currency:'EUR':'symbol':'1.0-0' }}</div></div>
            </div></mat-card>
            <mat-card class="sf-card"><div class="kpi">
              <span class="kpi-icon tone-info"><mat-icon>local_shipping</mat-icon></span>
              <div><div class="kpi-label">Pedidos en curso</div><div class="kpi-value">{{ d.kpis.pedidosAbiertos }}</div>
                <div class="kpi-sub">{{ d.kpis.totalProveedores }} proveedores activos</div></div>
            </div></mat-card>
            <mat-card class="sf-card"><div class="kpi">
              <span class="kpi-icon tone-muted"><mat-icon>swap_horiz</mat-icon></span>
              <div><div class="kpi-label">Movimientos hoy</div><div class="kpi-value">{{ d.kpis.movimientosHoy }}</div>
                <div class="kpi-sub">entradas, salidas y ajustes</div></div>
            </div></mat-card>
          </div>

          <div class="grid-2">
            <mat-card class="sf-card">
              <mat-card-header>
                <mat-card-title>Entradas y salidas · últimos 30 días</mat-card-title>
                <a mat-button routerLink="/movimientos" class="card-actions">Ver historial</a>
              </mat-card-header>
              <mat-card-content>
                <div class="grafica"><canvas baseChart type="bar" [data]="grafica()" [options]="opcionesGrafica"></canvas></div>
              </mat-card-content>
            </mat-card>

            <mat-card class="sf-card flush">
              <mat-card-header>
                <mat-card-title>Stock crítico</mat-card-title>
                <a mat-button routerLink="/alertas" class="card-actions">Ver alertas</a>
              </mat-card-header>
              <mat-card-content>
                @if (!d.articulosCriticos.length) {
                  <div class="vacio"><mat-icon>task_alt</mat-icon>Todo el stock está por encima del mínimo</div>
                } @else {
                  <mat-list>
                    @for (a of d.articulosCriticos; track a.id) {
                      <mat-list-item class="clicable" (click)="ficha(a.id)">
                        <span matListItemIcon [class]="'app-ico ' + (a.stock === 0 ? 'bg-red' : 'bg-orange')"><mat-icon>{{ a.stock === 0 ? 'block' : 'warning' }}</mat-icon></span>
                        <span matListItemTitle>{{ a.nombre }}</span>
                        <span matListItemLine>{{ a.stock }} {{ a.unidad }} · mínimo {{ a.stock_minimo }}</span>
                      </mat-list-item>
                    }
                  </mat-list>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <div class="grid-2">
            <mat-card class="sf-card flush">
              <mat-card-header>
                <mat-card-title>Últimos movimientos</mat-card-title>
                <a mat-button routerLink="/movimientos" class="card-actions">Ver todos</a>
              </mat-card-header>
              <mat-card-content class="tabla">
                <table mat-table [dataSource]="d.movimientosRecientes.slice(0, 8)">
                  <ng-container matColumnDef="articulo">
                    <th mat-header-cell *matHeaderCellDef>Artículo</th>
                    <td mat-cell *matCellDef="let m"><div class="fuerte">{{ m.nombre_articulo }}</div><div class="secundario">{{ m.referencia }}</div></td>
                  </ng-container>
                  <ng-container matColumnDef="tipo">
                    <th mat-header-cell *matHeaderCellDef>Tipo</th>
                    <td mat-cell *matCellDef="let m"><span class="estado" [class]="'estado ' + tipo(m.tipo).tono"><mat-icon>{{ tipo(m.tipo).icono }}</mat-icon>{{ tipo(m.tipo).texto }}</span></td>
                  </ng-container>
                  <ng-container matColumnDef="cantidad">
                    <th mat-header-cell *matHeaderCellDef class="num">Cantidad</th>
                    <td mat-cell *matCellDef="let m" class="num">{{ m.cantidad | number }} {{ m.unidad }}</td>
                  </ng-container>
                  <ng-container matColumnDef="stock">
                    <th mat-header-cell *matHeaderCellDef class="num">Stock</th>
                    <td mat-cell *matCellDef="let m" class="num secundario">{{ m.stock_antes | number }} → {{ m.stock_despues | number }}</td>
                  </ng-container>
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha</th>
                    <td mat-cell *matCellDef="let m" class="secundario">{{ m.fecha | date:'d MMM, HH:mm' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="columnasMov"></tr>
                  <tr mat-row *matRowDef="let row; columns: columnasMov" class="clicable" (click)="ficha(row.articulo_id)"></tr>
                </table>
              </mat-card-content>
            </mat-card>

            <div class="stack">
              <mat-card class="sf-card flush">
                <mat-card-header><mat-card-title>Más movidos · 30 días</mat-card-title></mat-card-header>
                <mat-card-content>
                  <mat-list>
                    @for (a of d.masMovidos; track a.id; let i = $index) {
                      <mat-list-item class="clicable" (click)="ficha(a.id)">
                        <span matListItemAvatar class="puesto">{{ i + 1 }}</span>
                        <span matListItemTitle>{{ a.nombre }}</span>
                        <span matListItemLine>{{ a.referencia }} · {{ a.num_movimientos }} movimientos</span>
                      </mat-list-item>
                    }
                  </mat-list>
                </mat-card-content>
              </mat-card>

              @if (d.pedidosPendientes.length) {
                <mat-card class="sf-card flush">
                  <mat-card-header>
                    <mat-card-title>Pedidos en tránsito</mat-card-title>
                    <a mat-button routerLink="/pedidos" class="card-actions">Ver pedidos</a>
                  </mat-card-header>
                  <mat-card-content>
                    <mat-list>
                      @for (p of d.pedidosPendientes; track p.id) {
                        <mat-list-item>
                          <mat-icon matListItemIcon>{{ estado(p.estado).icono }}</mat-icon>
                          <span matListItemTitle>{{ p.numero_pedido }} · {{ p.nombre_proveedor }}</span>
                          <span matListItemLine>{{ estado(p.estado).texto }} · previsto {{ p.fecha_esperada | date:'d MMM' }}</span>
                        </mat-list-item>
                      }
                    </mat-list>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grafica { height: 340px; position: relative; }
    .aviso { color: var(--sf-warn); }
    .puesto { display: flex; align-items: center; justify-content: center; background: var(--sf-primary-50);
              color: var(--sf-primary); font-weight: 500; font-size: 14px; }
  `],
})
export class DashboardComponent implements OnInit {
  private api    = inject(ApiService);
  private avisos = inject(AvisosService);
  private dialog = inject(MatDialog);

  d        = signal<any>(null);
  cargando = signal(true);
  hoy      = new Date();
  columnasMov = ['articulo', 'tipo', 'cantidad', 'stock', 'fecha'];

  grafica = computed<ChartConfiguration<'bar'>['data']>(() => {
    const dias = this.d()?.graficaMovimientos ?? [];
    return {
      labels: dias.map((x: any) => new Date(x.dia + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })),
      datasets: [
        { label: 'Entradas', data: dias.map((x: any) => x.entradas), backgroundColor: '#34c759', borderRadius: 4, maxBarThickness: 14 },
        { label: 'Salidas',  data: dias.map((x: any) => x.salidas),  backgroundColor: '#ff3b30', borderRadius: 4, maxBarThickness: 14 },
      ],
    };
  });

  opcionesGrafica: ChartConfiguration<'bar'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { beginAtZero: true, grid: { color: '#eef0f5' }, ticks: { precision: 0 } },
    },
  };

  tipo   = (t: string) => TIPO_MOVIMIENTO[t] ?? desconocido(t);
  estado = (e: string) => ESTADO_PEDIDO[e] ?? desconocido(e);

  ficha(id: number) {
    if (!id) return;
    this.dialog.open(ArticuloDetalleDialog, { width: '860px', maxWidth: '95vw', data: { id } })
      .afterClosed().subscribe(() => this.cargar());
  }

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.obtenerPanel().subscribe({
      next: d => { this.d.set(d); this.cargando.set(false); },
      error: e => { this.avisos.error(e, 'No se pudo cargar el panel'); this.cargando.set(false); },
    });
  }
}

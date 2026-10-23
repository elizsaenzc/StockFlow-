import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../shared/avisos.service';
import { ESTADO_PEDIDO, TIPO_MOVIMIENTO, desconocido, estadoStock } from '../../shared/estados';
import { MovimientoDialog } from './movimiento.dialog';

/** Ficha de artículo: evolución del stock, datos clave, pedidos abiertos e historial. */
@Component({
  selector: 'sf-articulo-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule,
            MatTabsModule, MatProgressSpinnerModule, BaseChartDirective],
  template: `
    @if (!a()) {
      <div class="cargando"><mat-spinner diameter="36" /></div>
    } @else {
      <div mat-dialog-title class="cabecera">
        <span class="app-ico lg" [class]="'app-ico lg ' + icono().fondo"><mat-icon>{{ icono().icono }}</mat-icon></span>
        <div class="titulos">
          <div class="nombre">{{ a().nombre }}</div>
          <div class="secundario">{{ a().referencia }} · EAN {{ a().cod_barras }} · {{ a().nombre_familia }}</div>
        </div>
        <span [class]="'estado ' + est().tono"><mat-icon>{{ est().icono }}</mat-icon>{{ est().texto }}</span>
      </div>

      <mat-dialog-content>
        <div class="datos">
          <div class="dato"><div class="k">Stock actual</div><div class="v grande">{{ a().stock | number }} {{ a().unidad }}</div></div>
          <div class="dato"><div class="k">Mínimo / máximo</div><div class="v">{{ a().stock_minimo }} / {{ a().stock_maximo ?? '—' }}</div></div>
          <div class="dato"><div class="k">Coste · PVP</div><div class="v">{{ a().precio_coste | currency }} · {{ a().precio_venta | currency }}</div></div>
          <div class="dato"><div class="k">Margen</div><div class="v">{{ margen() | number:'1.0-1' }} %</div></div>
          <div class="dato"><div class="k">Valor en almacén</div><div class="v">{{ a().stock * a().precio_coste | currency }}</div></div>
          <div class="dato"><div class="k">Ubicación</div><div class="v">{{ a().nombre_almacen }} · {{ a().ubicacion }}</div></div>
          <div class="dato"><div class="k">Proveedor</div><div class="v">{{ a().nombre_proveedor ?? '—' }}</div></div>
          <div class="dato"><div class="k">Salidas · 30 días</div><div class="v">{{ salidas30() | number }} {{ a().unidad }}</div></div>
        </div>

        <h3 class="seccion">Evolución del stock</h3>
        <div class="grafica"><canvas baseChart type="line" [data]="grafica()" [options]="opciones"></canvas></div>

        @if (a().pedidosAbiertos.length) {
          <h3 class="seccion">Pedidos en curso</h3>
          @for (p of a().pedidosAbiertos; track p.id) {
            <div class="pedido">
              <span [class]="'estado ' + estado(p.estado).tono"><mat-icon>{{ estado(p.estado).icono }}</mat-icon>{{ estado(p.estado).texto }}</span>
              <span class="ref">{{ p.numero_pedido }}</span>
              <span>{{ p.cantidad_pedida - p.cantidad_recibida | number }} {{ a().unidad }} pendientes</span>
              <span class="secundario">previsto {{ p.fecha_esperada | date:'d MMM' }}</span>
            </div>
          }
        }

        <h3 class="seccion">Últimos movimientos</h3>
        <table mat-table [dataSource]="a().movimientos.slice(0, 10)" class="historial">
          <ng-container matColumnDef="fecha"><th mat-header-cell *matHeaderCellDef>Fecha</th><td mat-cell *matCellDef="let m" class="secundario">{{ m.fecha | date:'dd/MM HH:mm' }}</td></ng-container>
          <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let m"><span [class]="'estado ' + tipo(m.tipo).tono">{{ tipo(m.tipo).texto }}</span></td></ng-container>
          <ng-container matColumnDef="cantidad"><th mat-header-cell *matHeaderCellDef class="num">Cantidad</th>
            <td mat-cell *matCellDef="let m" class="num fuerte">{{ m.tipo === 'salida' ? '−' : '+' }}{{ m.cantidad | number }}</td></ng-container>
          <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef class="num">Stock</th>
            <td mat-cell *matCellDef="let m" class="num secundario">{{ m.stock_despues | number }}</td></ng-container>
          <ng-container matColumnDef="motivo"><th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let m"><div>{{ m.motivo }}</div><div class="secundario">{{ m.documento }}</div></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let r; columns: cols"></tr>
        </table>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cerrar</button>
        @if (auth.puedeMover()) {
          <button mat-flat-button color="primary" (click)="mover()"><mat-icon>swap_horiz</mat-icon> Registrar movimiento</button>
        }
      </mat-dialog-actions>
    }
  `,
  styles: [`
    .cabecera { display: flex; align-items: center; gap: 14px; padding-top: 20px !important; }
    .titulos { flex: 1; min-width: 0; }
    .nombre { font-size: 19px; font-weight: 700; line-height: 1.3; }
    .titulos .secundario { font-weight: 400; }
    .grande { font-size: 20px; }
    .seccion { font-size: 15px; font-weight: 600; margin: 22px 0 10px; }
    .grafica { height: 220px; position: relative; }
    .pedido { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 10px 14px; background: var(--sf-bg); border-radius: 12px; margin-bottom: 8px; }
    .historial { width: 100%; }
  `],
})
export class ArticuloDetalleDialog implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);

  a = signal<any>(null);
  cols = ['fecha', 'tipo', 'cantidad', 'stock', 'motivo'];

  est = computed(() => estadoStock(this.a()));
  icono = computed(() => {
    const t = this.est().tono;
    return t === 'tone-danger' ? { icono: 'block', fondo: 'bg-red' }
         : t === 'tone-warn' ? { icono: 'warning', fondo: 'bg-orange' }
         : { icono: 'inventory_2', fondo: 'bg-indigo' };
  });
  margen = computed(() => {
    const x = this.a();
    return x.precio_venta > 0 ? ((x.precio_venta - x.precio_coste) / x.precio_venta) * 100 : 0;
  });
  salidas30 = computed(() => {
    const limite = Date.now() - 30 * 86400000;
    return this.a().movimientos.filter((m: any) => m.tipo === 'salida' && new Date(m.fecha).getTime() >= limite)
      .reduce((s: number, m: any) => s + m.cantidad, 0);
  });

  // Serie de stock por día a partir del historial (último stock de cada día)
  grafica = computed<ChartConfiguration<'line'>['data']>(() => {
    const movs = [...this.a().movimientos].reverse();
    const porDia = new Map<string, number>();
    movs.forEach((m: any) => porDia.set(new Date(m.fecha).toLocaleDateString('sv-SE'), m.stock_despues));
    const dias = [...porDia.keys()];
    const etiqueta = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return {
      labels: dias.map(etiqueta),
      datasets: [
        { label: 'Stock', data: dias.map(d => porDia.get(d)!), borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,.1)',
          fill: true, stepped: true, pointRadius: 0, borderWidth: 2 },
        { label: 'Mínimo', data: dias.map(() => this.a().stock_minimo), borderColor: '#ff3b30', borderDash: [6, 4],
          pointRadius: 0, borderWidth: 1.5, fill: false },
      ],
    };
  });

  opciones: ChartConfiguration<'line'>['options'] = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
              y: { beginAtZero: true, grid: { color: '#f0f0f5' }, ticks: { precision: 0 } } },
  };

  tipo = (t: string) => TIPO_MOVIMIENTO[t] ?? desconocido(t);
  estado = (e: string) => ESTADO_PEDIDO[e] ?? desconocido(e);

  constructor(@Inject(MAT_DIALOG_DATA) private datos: { id: number }) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.obtenerArticulo(this.datos.id).subscribe({
      next: a => this.a.set(a),
      error: e => this.avisos.error(e, 'No se pudo cargar el artículo'),
    });
  }

  mover() {
    this.dialog.open(MovimientoDialog, { maxWidth: '95vw', data: { articulo: this.a() } })
      .afterClosed().subscribe(r => r && this.cargar());
  }
}

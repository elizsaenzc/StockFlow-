import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';

@Component({
  selector: 'sf-analytics',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatCardModule, MatIconModule, MatTableModule, MatProgressBarModule,
            MatProgressSpinnerModule, BaseChartDirective],
  template: `
    <div class="page">
      <div class="page-head"><h1>Analíticas</h1><span class="sub">Últimos 90 días</span></div>

      @if (cargando()) {
        <div class="cargando"><mat-spinner diameter="40" /></div>
      }
      @if (d(); as d) {
        <div class="stack">
          <div class="grid-2-eq">
            <mat-card class="sf-card">
              <mat-card-header><mat-card-title>Valor de stock por familia</mat-card-title>
                <span class="card-actions secundario">{{ totalValor() | currency:'EUR':'symbol':'1.0-0' }} a coste</span></mat-card-header>
              <mat-card-content><div class="grafica"><canvas baseChart type="doughnut" [data]="familias()" [options]="opcionesDonut"></canvas></div></mat-card-content>
            </mat-card>
            <mat-card class="sf-card">
              <mat-card-header><mat-card-title>Unidades movidas por día</mat-card-title></mat-card-header>
              <mat-card-content><div class="grafica"><canvas baseChart type="line" [data]="actividad()" [options]="opcionesLinea"></canvas></div></mat-card-content>
            </mat-card>
          </div>

          <mat-card class="sf-card flush">
            <mat-card-header><mat-card-title>Rotación de artículos</mat-card-title></mat-card-header>
            <mat-card-content class="tabla">
              <table mat-table [dataSource]="d.rotacion">
                <ng-container matColumnDef="pos"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let a; let i = index" class="secundario">{{ i + 1 }}</td></ng-container>
                <ng-container matColumnDef="articulo"><th mat-header-cell *matHeaderCellDef>Artículo</th>
                  <td mat-cell *matCellDef="let a"><div class="fuerte">{{ a.nombre }}</div><div class="secundario">{{ a.referencia }}</div></td></ng-container>
                <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef class="num">Stock</th><td mat-cell *matCellDef="let a" class="num">{{ a.stock | number }} {{ a.unidad }}</td></ng-container>
                <ng-container matColumnDef="salidas"><th mat-header-cell *matHeaderCellDef class="num">Salidas</th><td mat-cell *matCellDef="let a" class="num salida">{{ a.salidas_90d | number }}</td></ng-container>
                <ng-container matColumnDef="entradas"><th mat-header-cell *matHeaderCellDef class="num">Entradas</th><td mat-cell *matCellDef="let a" class="num entrada">{{ a.entradas_90d | number }}</td></ng-container>
                <ng-container matColumnDef="actividad"><th mat-header-cell *matHeaderCellDef>Movimientos</th>
                  <td mat-cell *matCellDef="let a" class="barra-celda"><mat-progress-bar mode="determinate" [value]="pct(a.num_movimientos)" /><span class="secundario">{{ a.num_movimientos }}</span></td></ng-container>
                <tr mat-header-row *matHeaderRowDef="colsRotacion"></tr>
                <tr mat-row *matRowDef="let r; columns: colsRotacion"></tr>
              </table>
            </mat-card-content>
          </mat-card>

          <div class="grid-2-eq">
            <mat-card class="sf-card flush">
              <mat-card-header><mat-card-title>Rendimiento de proveedores</mat-card-title></mat-card-header>
              <mat-card-content class="tabla">
                <table mat-table [dataSource]="d.rendimientoProveedores">
                  <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Proveedor</th><td mat-cell *matCellDef="let p" class="fuerte">{{ p.nombre }}</td></ng-container>
                  <ng-container matColumnDef="puntuacion"><th mat-header-cell *matHeaderCellDef class="num">Puntuación</th><td mat-cell *matCellDef="let p" class="num">{{ p.puntuacion | number:'1.1-1' }}</td></ng-container>
                  <ng-container matColumnDef="pedidos"><th mat-header-cell *matHeaderCellDef class="num">Recibidos</th><td mat-cell *matCellDef="let p" class="num">{{ p.completados }} / {{ p.total_pedidos }}</td></ng-container>
                  <ng-container matColumnDef="gasto"><th mat-header-cell *matHeaderCellDef class="num">Gasto</th><td mat-cell *matCellDef="let p" class="num">{{ p.gasto_total | currency:'EUR':'symbol':'1.0-0' }}</td></ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsProv"></tr>
                  <tr mat-row *matRowDef="let r; columns: colsProv"></tr>
                </table>
              </mat-card-content>
            </mat-card>

            <mat-card class="sf-card flush">
              <mat-card-header><mat-card-title>Stock inmovilizado</mat-card-title><span class="card-actions secundario">sin movimiento en 60 días</span></mat-card-header>
              <mat-card-content class="tabla">
                @if (!d.stockInmovilizado.length) {
                  <div class="vacio"><mat-icon>task_alt</mat-icon>Todo el stock ha tenido movimiento en los últimos 60 días</div>
                } @else {
                  <table mat-table [dataSource]="d.stockInmovilizado">
                    <ng-container matColumnDef="articulo"><th mat-header-cell *matHeaderCellDef>Artículo</th><td mat-cell *matCellDef="let a" class="fuerte">{{ a.nombre }}</td></ng-container>
                    <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef class="num">Valor</th><td mat-cell *matCellDef="let a" class="num">{{ a.valor_inmovilizado | currency }}</td></ng-container>
                    <ng-container matColumnDef="ultimo"><th mat-header-cell *matHeaderCellDef>Último movimiento</th><td mat-cell *matCellDef="let a" class="secundario">{{ a.ultimo_movimiento ? (a.ultimo_movimiento | date:'d MMM y') : 'Nunca' }}</td></ng-container>
                    <tr mat-header-row *matHeaderRowDef="['articulo','valor','ultimo']"></tr>
                    <tr mat-row *matRowDef="let r; columns: ['articulo','valor','ultimo']"></tr>
                  </table>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grafica { height: 280px; position: relative; }
    .barra-celda { display: flex; align-items: center; gap: 10px; min-width: 160px; height: 52px; }
    .barra-celda mat-progress-bar { width: 120px; }
  `],
})
export class AnalyticsComponent implements OnInit {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);

  d = signal<any>(null);
  cargando = signal(true);
  colsRotacion = ['pos', 'articulo', 'stock', 'salidas', 'entradas', 'actividad'];
  colsProv = ['nombre', 'puntuacion', 'pedidos', 'gasto'];

  totalValor = computed(() => (this.d()?.valorPorFamilia ?? []).reduce((s: number, f: any) => s + f.valor_coste, 0));

  familias = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const f = this.d()?.valorPorFamilia ?? [];
    return {
      labels: f.map((x: any) => x.nombre),
      datasets: [{ data: f.map((x: any) => Math.round(x.valor_coste)), backgroundColor: f.map((x: any) => x.color), borderWidth: 2, borderColor: '#fff' }],
    };
  });

  actividad = computed<ChartConfiguration<'line'>['data']>(() => {
    const dias = this.d()?.graficaDiaria ?? [];
    const etiqueta = (x: any) => new Date(x.dia + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return {
      labels: dias.map(etiqueta),
      datasets: [
        { label: 'Entradas', data: dias.map((x: any) => x.entradas), borderColor: '#43a047', backgroundColor: 'rgba(67,160,71,.12)', fill: true, tension: .3, pointRadius: 0 },
        { label: 'Salidas',  data: dias.map((x: any) => x.salidas),  borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,.08)', fill: true, tension: .3, pointRadius: 0 },
      ],
    };
  });

  opcionesDonut: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true, maintainAspectRatio: false, cutout: '62%',
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: { callbacks: { label: c => ` ${c.label}: ${Number(c.raw).toLocaleString('es-ES')} €` } },
    },
  };

  opcionesLinea: ChartConfiguration<'line'>['options'] = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
      y: { beginAtZero: true, grid: { color: '#eef0f5' }, ticks: { precision: 0 } },
    },
  };

  ngOnInit() {
    this.api.obtenerAnaliticas().subscribe({
      next: d => { this.d.set(d); this.cargando.set(false); },
      error: e => { this.avisos.error(e, 'No se pudieron cargar las analíticas'); this.cargando.set(false); },
    });
  }

  private maxMov = computed(() => Math.max(1, ...(this.d()?.rotacion ?? []).map((r: any) => r.num_movimientos)));
  pct(n: number) { return (n / this.maxMov()) * 100; }
}

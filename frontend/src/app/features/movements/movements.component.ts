import { AfterViewInit, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { aIso } from '../../shared/fechas';
import { exportarCsv } from '../../shared/exportar';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';
import { TIPO_MOVIMIENTO, desconocido } from '../../shared/estados';

@Component({
  selector: 'sf-movements',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressBarModule, MatDatepickerModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Movimientos</h1>
        <button mat-stroked-button (click)="exportar()"><mat-icon>download</mat-icon> Exportar</button>
      </div>

      <div class="kpis resumen">
        @for (r of resumen(); track r.tipo) {
          <mat-card class="sf-card"><div class="kpi">
            <span [class]="'kpi-icon ' + r.tono"><mat-icon>{{ r.icono }}</mat-icon></span>
            <div><div class="kpi-label">{{ r.texto }}</div><div class="kpi-value">{{ r.n }}</div>
              <div class="kpi-sub">{{ r.unidades | number }} unidades</div></div>
          </div></mat-card>
        }
      </div>

      <div class="filters densa">
        <mat-form-field><mat-label>Tipo</mat-label>
          <mat-select [(ngModel)]="f.tipo" (selectionChange)="cargar()">
            <mat-option value="">Todos</mat-option>
            <mat-option value="entrada">Entradas</mat-option>
            <mat-option value="salida">Salidas</mat-option>
            <mat-option value="ajuste">Ajustes</mat-option>
          </mat-select></mat-form-field>
        <mat-form-field><mat-label>Periodo</mat-label>
          <mat-date-range-input [rangePicker]="rango" [max]="hoy">
            <input matStartDate placeholder="Desde" [(ngModel)]="f.desde" />
            <input matEndDate placeholder="Hasta" [(ngModel)]="f.hasta" (dateChange)="cargar()" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="rango" />
          <mat-date-range-picker #rango />
        </mat-form-field>
        <mat-form-field class="buscar"><mat-icon matPrefix>search</mat-icon><mat-label>Artículo o documento</mat-label>
          <input matInput [(ngModel)]="texto" (ngModelChange)="datos.filter = $event.trim().toLowerCase()" /></mat-form-field>
        @if (f.tipo || f.desde || f.hasta) { <button mat-button (click)="f = { tipo: '', desde: null, hasta: null }; cargar()"><mat-icon>filter_alt_off</mat-icon> Limpiar</button> }
      </div>

      <mat-card class="sf-card flush">
        @if (cargando()) { <mat-progress-bar mode="indeterminate" /> }
        <div class="tabla">
          <table mat-table [dataSource]="datos" matSort>
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
              <td mat-cell *matCellDef="let m" class="secundario">{{ m.fecha | date:'dd/MM/yy HH:mm' }}</td>
            </ng-container>
            <ng-container matColumnDef="articulo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="nombre_articulo">Artículo</th>
              <td mat-cell *matCellDef="let m"><div class="fuerte">{{ m.nombre_articulo }}</div><div class="secundario">{{ m.referencia }} · {{ m.nombre_almacen ?? 'sin almacén' }}</div></td>
            </ng-container>
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Tipo</th>
              <td mat-cell *matCellDef="let m"><span [class]="'estado ' + tipo(m.tipo).tono"><mat-icon>{{ tipo(m.tipo).icono }}</mat-icon>{{ tipo(m.tipo).texto }}</span></td>
            </ng-container>
            <ng-container matColumnDef="cantidad">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Cantidad</th>
              <td mat-cell *matCellDef="let m" class="num fuerte">{{ signo(m) }}{{ m.cantidad | number }} {{ m.unidad }}</td>
            </ng-container>
            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef class="num">Stock</th>
              <td mat-cell *matCellDef="let m" class="num secundario">{{ m.stock_antes | number }} → <span [class]="m.stock_despues > m.stock_antes ? 'entrada' : m.stock_despues < m.stock_antes ? 'salida' : ''">{{ m.stock_despues | number }}</span></td>
            </ng-container>
            <ng-container matColumnDef="motivo">
              <th mat-header-cell *matHeaderCellDef>Motivo</th>
              <td mat-cell *matCellDef="let m"><div>{{ m.motivo ?? '—' }}</div>@if (m.documento) { <div class="secundario">{{ m.documento }}</div> }</td>
            </ng-container>
            <ng-container matColumnDef="usuario">
              <th mat-header-cell *matHeaderCellDef>Usuario</th>
              <td mat-cell *matCellDef="let m" class="secundario">{{ m.nombre_usuario ?? '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnas; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columnas"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="columnas.length"><div class="vacio"><mat-icon>swap_horiz</mat-icon>No hay movimientos en este periodo</div></td>
            </tr>
          </table>
        </div>
        <mat-paginator [pageSize]="20" [pageSizeOptions]="[20, 50, 100]" showFirstLastButtons />
      </mat-card>
    </div>
  `,
  styles: [`.resumen { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 20px; }
            @media (max-width: 600px) { .resumen { grid-template-columns: 1fr; } }`],
})
export class MovementsComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  datos = new MatTableDataSource<any>([]);
  lista = signal<any[]>([]);
  cargando = signal(true);
  texto = '';
  f: { tipo: string; desde: Date | null; hasta: Date | null } = { tipo: '', desde: null, hasta: null };
  hoy = new Date();
  columnas = ['fecha', 'articulo', 'tipo', 'cantidad', 'stock', 'motivo', 'usuario'];

  resumen = computed(() => ['entrada', 'salida', 'ajuste'].map(t => {
    const de = this.lista().filter(m => m.tipo === t);
    return { tipo: t, ...TIPO_MOVIMIENTO[t], texto: TIPO_MOVIMIENTO[t].texto + 's', n: de.length, unidades: de.reduce((s, m) => s + m.cantidad, 0) };
  }));

  tipo = (t: string) => TIPO_MOVIMIENTO[t] ?? desconocido(t);
  signo = (m: any) => (m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '−' : '');

  ngOnInit() {
    this.datos.filterPredicate = (m, t) =>
      `${m.nombre_articulo} ${m.referencia ?? ''} ${m.documento ?? ''} ${m.motivo ?? ''}`.toLowerCase().includes(t);
    this.cargar();
  }

  ngAfterViewInit() { this.datos.sort = this.sort; this.datos.paginator = this.paginator; }

  exportar() {
    const filas = this.datos.sortData(this.datos.filteredData.slice(), this.sort);
    exportarCsv('movimientos', [
      { titulo: 'Fecha', valor: m => new Date(m.fecha).toLocaleString('es-ES') },
      { titulo: 'Tipo', valor: m => this.tipo(m.tipo).texto },
      { titulo: 'Referencia', valor: m => m.referencia },
      { titulo: 'Artículo', valor: m => m.nombre_articulo },
      { titulo: 'Cantidad', valor: m => m.cantidad },
      { titulo: 'Unidad', valor: m => m.unidad },
      { titulo: 'Stock anterior', valor: m => m.stock_antes },
      { titulo: 'Stock posterior', valor: m => m.stock_despues },
      { titulo: 'Motivo', valor: m => m.motivo },
      { titulo: 'Documento', valor: m => m.documento },
      { titulo: 'Almacén', valor: m => m.nombre_almacen },
      { titulo: 'Usuario', valor: m => m.nombre_usuario },
    ], filas);
    this.avisos.ok(`${filas.length} movimientos exportados`);
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarMovimientos({ tipo: this.f.tipo, desde: aIso(this.f.desde), hasta: aIso(this.f.hasta), limite: 1000 }).subscribe({
      next: m => { this.lista.set(m); this.datos.data = m; this.cargando.set(false); },
      error: e => { this.avisos.error(e, 'No se pudieron cargar los movimientos'); this.cargando.set(false); },
    });
  }
}

import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../shared/avisos.service';
import { ConfirmarDialog } from '../../shared/confirmar.dialog';
import { estadoStock } from '../../shared/estados';
import { ArticuloDialog } from './articulo.dialog';
import { MovimientoDialog } from './movimiento.dialog';
import { ArticuloDetalleDialog } from './articulo-detalle.dialog';
import { exportarCsv } from '../../shared/exportar';

@Component({
  selector: 'sf-products',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule, MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatMenuModule, MatCardModule,
            MatTooltipModule, MatProgressBarModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Artículos</h1>
        <button mat-stroked-button (click)="exportar()"><mat-icon>download</mat-icon> Exportar</button>
        @if (auth.puedeEditar()) {
          <button mat-flat-button color="primary" (click)="editar()"><mat-icon>add</mat-icon> Nuevo artículo</button>
        }
      </div>

      <div class="filters densa">
        <mat-form-field class="buscar">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Buscar</mat-label>
          <input matInput [(ngModel)]="f.texto" (ngModelChange)="filtrar()" placeholder="Referencia, nombre o código" />
        </mat-form-field>
        <mat-form-field><mat-label>Familia</mat-label>
          <mat-select [(ngModel)]="f.familia" (selectionChange)="filtrar()">
            <mat-option [value]="null">Todas</mat-option>
            @for (x of familias(); track x.id) { <mat-option [value]="x.id">{{ x.nombre }}</mat-option> }
          </mat-select></mat-form-field>
        <mat-form-field><mat-label>Almacén</mat-label>
          <mat-select [(ngModel)]="f.almacen" (selectionChange)="filtrar()">
            <mat-option [value]="null">Todos</mat-option>
            @for (x of almacenes(); track x.id) { <mat-option [value]="x.id">{{ x.nombre }}</mat-option> }
          </mat-select></mat-form-field>
        <mat-form-field><mat-label>Estado del stock</mat-label>
          <mat-select [(ngModel)]="f.estado" (selectionChange)="filtrar()">
            <mat-option [value]="null">Todos</mat-option>
            <mat-option value="Correcto">Correcto</mat-option>
            <mat-option value="Bajo mínimo">Bajo mínimo</mat-option>
            <mat-option value="Sin stock">Sin stock</mat-option>
          </mat-select></mat-form-field>
        @if (hayFiltros()) { <button mat-button (click)="limpiar()"><mat-icon>filter_alt_off</mat-icon> Limpiar</button> }
      </div>

      <mat-card class="sf-card flush">
        @if (cargando()) { <mat-progress-bar mode="indeterminate" /> }
        <div class="tabla">
          <table mat-table [dataSource]="datos" matSort matSortActive="nombre" matSortDirection="asc">
            <ng-container matColumnDef="referencia">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Referencia</th>
              <td mat-cell *matCellDef="let a"><span class="ref">{{ a.referencia }}</span></td>
            </ng-container>
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Artículo</th>
              <td mat-cell *matCellDef="let a"><div class="fuerte">{{ a.nombre }}</div><div class="secundario">{{ a.nombre_familia ?? 'Sin familia' }}</div></td>
            </ng-container>
            <ng-container matColumnDef="almacen">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="nombre_almacen">Ubicación</th>
              <td mat-cell *matCellDef="let a"><div>{{ a.nombre_almacen ?? '—' }}</div><div class="secundario">{{ a.ubicacion }}</div></td>
            </ng-container>
            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Stock</th>
              <td mat-cell *matCellDef="let a" class="num"><span class="fuerte">{{ a.stock | number }}</span> {{ a.unidad }}<div class="secundario">mín. {{ a.stock_minimo }}</div></td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let a"><span [class]="'estado ' + est(a).tono"><mat-icon>{{ est(a).icono }}</mat-icon>{{ est(a).texto }}</span></td>
            </ng-container>
            <ng-container matColumnDef="coste">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="precio_coste" class="num">Coste</th>
              <td mat-cell *matCellDef="let a" class="num">{{ a.precio_coste | currency }}</td>
            </ng-container>
            <ng-container matColumnDef="venta">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="precio_venta" class="num">PVP</th>
              <td mat-cell *matCellDef="let a" class="num">{{ a.precio_venta | currency }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="celda-acciones"></th>
              <td mat-cell *matCellDef="let a" class="celda-acciones">
                @if (auth.puedeMover()) {
                  <button mat-icon-button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{ a: a }" (click)="$event.stopPropagation()" [attr.aria-label]="'Acciones de ' + a.nombre">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnas; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columnas" class="clicable" (click)="ficha(row)"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="columnas.length"><div class="vacio"><mat-icon>search_off</mat-icon>No hay artículos con esos filtros</div></td>
            </tr>
          </table>
        </div>
        <mat-paginator [pageSize]="15" [pageSizeOptions]="[15, 30, 50]" showFirstLastButtons />
      </mat-card>
    </div>

    <mat-menu #menu="matMenu">
      <ng-template matMenuContent let-a="a">
        <button mat-menu-item (click)="ficha(a)"><mat-icon>info</mat-icon><span>Ver ficha</span></button>
        <button mat-menu-item (click)="mover(a)"><mat-icon>swap_horiz</mat-icon><span>Registrar movimiento</span></button>
        @if (auth.puedeEditar()) {
          <button mat-menu-item (click)="editar(a)"><mat-icon>edit</mat-icon><span>Editar</span></button>
          <button mat-menu-item (click)="baja(a)"><mat-icon class="salida">delete</mat-icon><span>Dar de baja</span></button>
        }
      </ng-template>
    </mat-menu>
  `,
})
export class ProductsComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  datos = new MatTableDataSource<any>([]);
  familias = signal<any[]>([]);
  proveedores = signal<any[]>([]);
  almacenes = signal<any[]>([]);
  cargando = signal(true);
  columnas = ['referencia', 'nombre', 'almacen', 'stock', 'estado', 'coste', 'venta', 'acciones'];
  f: { texto: string; familia: number | null; almacen: number | null; estado: string | null } =
    { texto: '', familia: null, almacen: null, estado: null };

  est = estadoStock;

  ngOnInit() {
    // Filtro combinado: texto libre + familia + almacén + estado
    this.datos.filterPredicate = (a, filtro) => {
      const f = JSON.parse(filtro);
      const texto = `${a.referencia} ${a.nombre} ${a.cod_barras ?? ''}`.toLowerCase();
      return (!f.texto || texto.includes(f.texto.toLowerCase()))
        && (f.familia == null || a.familia_id === f.familia)
        && (f.almacen == null || a.almacen_id === f.almacen)
        && (!f.estado || estadoStock(a).texto === f.estado);
    };
    forkJoin([this.api.listarFamilias(), this.api.listarProveedores(), this.api.listarAlmacenes()]).subscribe(
      ([fa, pr, al]) => { this.familias.set(fa); this.proveedores.set(pr); this.almacenes.set(al); });
    this.cargar();
  }

  ngAfterViewInit() {
    this.datos.sort = this.sort;
    this.datos.paginator = this.paginator;
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarArticulos().subscribe({
      next: a => { this.datos.data = a; this.cargando.set(false); },
      error: e => { this.avisos.error(e, 'No se pudieron cargar los artículos'); this.cargando.set(false); },
    });
  }

  filtrar() { this.datos.filter = JSON.stringify(this.f); this.paginator?.firstPage(); }
  hayFiltros() { return !!(this.f.texto || this.f.familia || this.f.almacen || this.f.estado); }
  limpiar() { this.f = { texto: '', familia: null, almacen: null, estado: null }; this.filtrar(); }

  editar(articulo?: any) {
    this.dialog.open(ArticuloDialog, {
      width: '720px', maxWidth: '95vw',
      data: { articulo, familias: this.familias(), proveedores: this.proveedores(), almacenes: this.almacenes() },
    }).afterClosed().subscribe(r => r && this.cargar());
  }

  mover(articulo: any) {
    this.dialog.open(MovimientoDialog, { maxWidth: '95vw', data: { articulo } })
      .afterClosed().subscribe(r => r && this.cargar());
  }

  ficha(a: any) {
    this.dialog.open(ArticuloDetalleDialog, { width: '860px', maxWidth: '95vw', data: { id: a.id } })
      .afterClosed().subscribe(() => this.cargar());
  }

  /** Exporta lo que se ve: respeta filtros y orden actuales */
  exportar() {
    const filas = this.datos.sortData(this.datos.filteredData.slice(), this.sort);
    exportarCsv('articulos', [
      { titulo: 'Referencia', valor: a => a.referencia },
      { titulo: 'EAN', valor: a => a.cod_barras },
      { titulo: 'Artículo', valor: a => a.nombre },
      { titulo: 'Familia', valor: a => a.nombre_familia },
      { titulo: 'Proveedor', valor: a => a.nombre_proveedor },
      { titulo: 'Almacén', valor: a => a.nombre_almacen },
      { titulo: 'Ubicación', valor: a => a.ubicacion },
      { titulo: 'Stock', valor: a => a.stock },
      { titulo: 'Unidad', valor: a => a.unidad },
      { titulo: 'Stock mínimo', valor: a => a.stock_minimo },
      { titulo: 'Estado', valor: a => estadoStock(a).texto },
      { titulo: 'Coste (€)', valor: a => a.precio_coste },
      { titulo: 'PVP (€)', valor: a => a.precio_venta },
      { titulo: 'Valor stock (€)', valor: a => Math.round(a.stock * a.precio_coste * 100) / 100 },
    ], filas);
    this.avisos.ok(`${filas.length} artículos exportados`);
  }

  baja(a: any) {
    this.dialog.open(ConfirmarDialog, {
      data: { titulo: 'Dar de baja', mensaje: `¿Dar de baja «${a.nombre}»? Se conserva su historial de movimientos.`, accion: 'Dar de baja', peligro: true },
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.api.eliminarArticulo(a.id).subscribe({
        next: () => { this.avisos.ok('Artículo dado de baja'); this.cargar(); },
        error: e => this.avisos.error(e),
      });
    });
  }
}

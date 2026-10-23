import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../shared/avisos.service';
import { ConfirmarDialog } from '../../shared/confirmar.dialog';
import { ESTADO_PEDIDO, desconocido } from '../../shared/estados';
import { PedidoDetalleDialog, PedidoNuevoDialog, PedidoRecepcionDialog } from './pedido.dialogs';

@Component({
  selector: 'sf-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatIconModule,
            MatMenuModule, MatFormFieldModule, MatSelectModule, MatProgressBarModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Pedidos de compra</h1>
        @if (auth.puedeEditar()) {
          <button mat-flat-button color="primary" (click)="nuevo()"><mat-icon>add</mat-icon> Nuevo pedido</button>
        }
      </div>

      <div class="filters densa">
        <mat-form-field><mat-label>Estado</mat-label>
          <mat-select [(ngModel)]="filtro" (selectionChange)="cargar()">
            <mat-option value="">Todos</mat-option>
            @for (e of estados; track e[0]) { <mat-option [value]="e[0]">{{ e[1].texto }}</mat-option> }
          </mat-select></mat-form-field>
        <span class="secundario">{{ datos.data.length }} pedidos</span>
      </div>

      <mat-card class="sf-card flush">
        @if (cargando()) { <mat-progress-bar mode="indeterminate" /> }
        <div class="tabla">
          <table mat-table [dataSource]="datos" matSort matSortActive="fecha_alta" matSortDirection="desc">
            <ng-container matColumnDef="numero_pedido">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Pedido</th>
              <td mat-cell *matCellDef="let p"><span class="ref">{{ p.numero_pedido }}</span><div class="secundario">{{ p.fecha_alta | date:'d MMM y' }}</div></td>
            </ng-container>
            <ng-container matColumnDef="nombre_proveedor">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Proveedor</th>
              <td mat-cell *matCellDef="let p"><div class="fuerte">{{ p.nombre_proveedor }}</div><div class="secundario">{{ p.nombre_almacen ?? '' }}</div></td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Estado</th>
              <td mat-cell *matCellDef="let p"><span [class]="'estado ' + est(p.estado).tono"><mat-icon>{{ est(p.estado).icono }}</mat-icon>{{ est(p.estado).texto }}</span></td>
            </ng-container>
            <ng-container matColumnDef="lineas">
              <th mat-header-cell *matHeaderCellDef class="num">Líneas</th>
              <td mat-cell *matCellDef="let p" class="num">{{ p.lineas.length }}</td>
            </ng-container>
            <ng-container matColumnDef="fecha_esperada">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Entrega prevista</th>
              <td mat-cell *matCellDef="let p" [class.salida]="retrasado(p)">{{ p.fecha_esperada ? (p.fecha_esperada | date:'d MMM y') : '—' }}
                @if (retrasado(p)) { <div class="secundario">retrasado</div> }</td>
            </ng-container>
            <ng-container matColumnDef="importe_total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Importe</th>
              <td mat-cell *matCellDef="let p" class="num fuerte">{{ p.importe_total | currency }}</td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="celda-acciones"></th>
              <td mat-cell *matCellDef="let p" class="celda-acciones">
                <button mat-icon-button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{ p: p }" (click)="$event.stopPropagation()" [attr.aria-label]="'Acciones del pedido ' + p.numero_pedido">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnas"></tr>
            <tr mat-row *matRowDef="let p; columns: columnas" class="clicable" (click)="detalle(p)"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="columnas.length"><div class="vacio"><mat-icon>receipt_long</mat-icon>No hay pedidos</div></td>
            </tr>
          </table>
        </div>
      </mat-card>
    </div>

    <mat-menu #menu="matMenu">
      <ng-template matMenuContent let-p="p">
        <button mat-menu-item (click)="detalle(p)"><mat-icon>visibility</mat-icon><span>Ver detalle</span></button>
        @if (auth.puedeMover() && ['enviado', 'parcial'].includes(p.estado)) {
          <button mat-menu-item (click)="recibir(p)"><mat-icon>inventory</mat-icon><span>Registrar recepción</span></button>
        }
        @if (auth.puedeEditar() && !['recibido', 'cancelado'].includes(p.estado)) {
          <button mat-menu-item (click)="cancelar(p)"><mat-icon class="salida">cancel</mat-icon><span>Cancelar pedido</span></button>
        }
      </ng-template>
    </mat-menu>
  `,
  styles: [`.clicable { cursor: pointer; }`],
})
export class OrdersComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);
  @ViewChild(MatSort) sort!: MatSort;

  datos = new MatTableDataSource<any>([]);
  cargando = signal(true);
  filtro = '';
  estados = Object.entries(ESTADO_PEDIDO);
  columnas = ['numero_pedido', 'nombre_proveedor', 'estado', 'lineas', 'fecha_esperada', 'importe_total', 'acciones'];

  est = (e: string) => ESTADO_PEDIDO[e] ?? desconocido(e);
  retrasado = (p: any) => ['enviado', 'parcial'].includes(p.estado) && p.fecha_esperada && new Date(p.fecha_esperada + 'T23:59:59') < new Date();

  ngOnInit() { this.cargar(); }
  ngAfterViewInit() { this.datos.sort = this.sort; }

  cargar() {
    this.cargando.set(true);
    this.api.listarPedidos({ estado: this.filtro }).subscribe({
      next: p => { this.datos.data = p; this.cargando.set(false); },
      error: e => { this.avisos.error(e); this.cargando.set(false); },
    });
  }

  nuevo() {
    forkJoin([this.api.listarProveedores(), this.api.listarAlmacenes(), this.api.listarArticulos()]).subscribe(([proveedores, almacenes, articulos]) =>
      this.dialog.open(PedidoNuevoDialog, { width: '820px', maxWidth: '95vw', data: { proveedores, almacenes, articulos } })
        .afterClosed().subscribe(r => r && this.cargar()));
  }

  detalle(p: any) { this.dialog.open(PedidoDetalleDialog, { width: '760px', maxWidth: '95vw', data: p }); }

  recibir(p: any) {
    this.dialog.open(PedidoRecepcionDialog, { width: '620px', maxWidth: '95vw', data: p })
      .afterClosed().subscribe(r => r && this.cargar());
  }

  cancelar(p: any) {
    this.dialog.open(ConfirmarDialog, {
      data: { titulo: 'Cancelar pedido', mensaje: `¿Cancelar el pedido ${p.numero_pedido} de ${p.nombre_proveedor}?`, accion: 'Cancelar pedido', peligro: true },
    }).afterClosed().subscribe(ok => ok && this.api.cancelarPedido(p.id).subscribe({
      next: () => { this.avisos.ok('Pedido cancelado'); this.cargar(); },
      error: e => this.avisos.error(e),
    }));
  }
}

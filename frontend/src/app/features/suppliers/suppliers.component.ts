import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../shared/avisos.service';
import { ProveedorDetalleDialog, ProveedorFormDialog } from './proveedor.dialogs';

@Component({
  selector: 'sf-suppliers',
  standalone: true,
  imports: [DecimalPipe, MatTableModule, MatSortModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule,
            MatProgressBarModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Proveedores</h1>
        @if (auth.puedeEditar()) {
          <button mat-flat-button color="primary" (click)="editar()"><mat-icon>add</mat-icon> Nuevo proveedor</button>
        }
      </div>

      <mat-card class="sf-card flush">
        @if (cargando()) { <mat-progress-bar mode="indeterminate" /> }
        <div class="tabla">
          <table mat-table [dataSource]="datos" matSort matSortActive="puntuacion" matSortDirection="desc">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Proveedor</th>
              <td mat-cell *matCellDef="let p"><div class="fuerte">{{ p.nombre }}</div><div class="secundario">{{ p.contacto }} · {{ p.direccion }}</div></td>
            </ng-container>
            <ng-container matColumnDef="contacto">
              <th mat-header-cell *matHeaderCellDef>Contacto</th>
              <td mat-cell *matCellDef="let p"><div>{{ p.telefono }}</div><div class="secundario">{{ p.correo }}</div></td>
            </ng-container>
            <ng-container matColumnDef="plazo_entrega">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Plazo</th>
              <td mat-cell *matCellDef="let p" class="num">{{ p.plazo_entrega }} días</td>
            </ng-container>
            <ng-container matColumnDef="total_articulos">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Artículos</th>
              <td mat-cell *matCellDef="let p" class="num">{{ p.total_articulos }}</td>
            </ng-container>
            <ng-container matColumnDef="pedidos_abiertos">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="num">Pedidos abiertos</th>
              <td mat-cell *matCellDef="let p" class="num">{{ p.pedidos_abiertos }}</td>
            </ng-container>
            <ng-container matColumnDef="puntuacion">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Puntuación</th>
              <td mat-cell *matCellDef="let p">
                <span [class]="'estado ' + tono(p.puntuacion)"><mat-icon>star</mat-icon>{{ p.puntuacion | number:'1.1-1' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="celda-acciones"></th>
              <td mat-cell *matCellDef="let p" class="celda-acciones">
                @if (auth.puedeEditar()) {
                  <button mat-icon-button (click)="$event.stopPropagation(); editar(p)" matTooltip="Editar" [attr.aria-label]="'Editar ' + p.nombre"><mat-icon>edit</mat-icon></button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnas"></tr>
            <tr mat-row *matRowDef="let p; columns: columnas" class="clicable" (click)="ver(p)"></tr>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`.clicable { cursor: pointer; }`],
})
export class SuppliersComponent implements OnInit, AfterViewInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);
  @ViewChild(MatSort) sort!: MatSort;

  datos = new MatTableDataSource<any>([]);
  cargando = signal(true);
  columnas = ['nombre', 'contacto', 'plazo_entrega', 'total_articulos', 'pedidos_abiertos', 'puntuacion', 'acciones'];

  tono = (p: number) => (p >= 8.5 ? 'tone-ok' : p >= 7 ? 'tone-info' : 'tone-warn');

  ngOnInit() { this.cargar(); }
  ngAfterViewInit() { this.datos.sort = this.sort; }

  cargar() {
    this.api.listarProveedores().subscribe({
      next: p => { this.datos.data = p; this.cargando.set(false); },
      error: e => { this.avisos.error(e); this.cargando.set(false); },
    });
  }

  ver(p: any) {
    this.api.obtenerProveedor(p.id).subscribe({
      next: d => this.dialog.open(ProveedorDetalleDialog, { width: '760px', maxWidth: '95vw', data: d }),
      error: e => this.avisos.error(e),
    });
  }

  editar(p?: any) {
    this.dialog.open(ProveedorFormDialog, { width: '640px', maxWidth: '95vw', data: p ?? null })
      .afterClosed().subscribe(r => r && this.cargar());
  }
}

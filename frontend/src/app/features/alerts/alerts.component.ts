import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../shared/avisos.service';
import { MovimientoDialog } from '../products/movimiento.dialog';

@Component({
  selector: 'sf-alerts',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Alertas de stock</h1>
        @if (!cargando()) { <span class="sub">{{ sinStock().length }} sin stock · {{ bajo().length }} bajo mínimo</span> }
      </div>

      @if (cargando()) {
        <div class="cargando"><mat-spinner diameter="40" /></div>
      } @else if (!articulos().length) {
        <mat-card class="sf-card"><div class="vacio"><mat-icon>task_alt</mat-icon>
          <div class="fuerte">Sin alertas</div>Todos los artículos están por encima de su stock mínimo.</div></mat-card>
      } @else {
        @for (grupo of grupos(); track grupo.titulo) {
          @if (grupo.lista.length) {
            <h2 class="grupo"><mat-icon [class]="grupo.clase">{{ grupo.icono }}</mat-icon>{{ grupo.titulo }} · {{ grupo.lista.length }}</h2>
            <div class="cards-grid">
              @for (a of grupo.lista; track a.id) {
                <mat-card class="sf-card alerta" [class.agotado]="a.stock === 0">
                  <mat-card-header>
                    <mat-card-title>{{ a.nombre }}</mat-card-title>
                    <mat-card-subtitle>{{ a.referencia }} · {{ a.nombre_almacen ?? 'Sin almacén' }} {{ a.ubicacion ? '· ' + a.ubicacion : '' }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="niveles">
                      <span><span class="cifra">{{ a.stock | number }}</span> {{ a.unidad }} disponibles</span>
                      <span class="secundario">mínimo {{ a.stock_minimo }}</span>
                    </div>
                    <mat-progress-bar mode="determinate" [value]="nivel(a)" [color]="a.stock === 0 ? 'warn' : 'accent'" />
                    @if (a.nombre_proveedor) {
                      <div class="proveedor"><mat-icon>local_shipping</mat-icon>{{ a.nombre_proveedor }}</div>
                    }
                  </mat-card-content>
                  @if (auth.puedeMover()) {
                    <mat-card-actions align="end">
                      <button mat-stroked-button color="primary" (click)="reponer(a)"><mat-icon>add_box</mat-icon> Reponer {{ sugerido(a) }} {{ a.unidad }}</button>
                    </mat-card-actions>
                  }
                </mat-card>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .grupo { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; margin: 8px 0 12px; }
    .grupo:not(:first-of-type) { margin-top: 24px; }
    .rojo { color: var(--sf-danger); } .ambar { color: var(--sf-warn); }
    .alerta { border-left: 4px solid var(--sf-warn) !important; }
    .alerta.agotado { border-left-color: var(--sf-danger) !important; }
    .niveles { display: flex; justify-content: space-between; align-items: baseline; margin: 8px 0; }
    .cifra { font-size: 22px; font-weight: 500; }
    .proveedor { display: flex; align-items: center; gap: 6px; margin-top: 12px; color: var(--sf-text-2); font-size: 13px; }
    .proveedor .mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class AlertsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);

  articulos = signal<any[]>([]);
  cargando = signal(true);
  sinStock = computed(() => this.articulos().filter(a => a.stock === 0));
  bajo     = computed(() => this.articulos().filter(a => a.stock > 0));
  grupos   = computed(() => [
    { titulo: 'Sin stock', icono: 'block', clase: 'rojo', lista: this.sinStock() },
    { titulo: 'Bajo mínimo', icono: 'warning', clase: 'ambar', lista: this.bajo() },
  ]);

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.listarArticulos().subscribe({
      next: a => {
        this.articulos.set(a.filter((x: any) => x.stock <= x.stock_minimo).sort((x: any, y: any) => x.stock - y.stock));
        this.cargando.set(false);
      },
      error: e => { this.avisos.error(e); this.cargando.set(false); },
    });
  }

  nivel(a: any) { return Math.min(100, (a.stock / Math.max(1, a.stock_minimo)) * 100); }
  /** Cantidad de reorden configurada, o lo necesario para recuperar el mínimo con margen */
  sugerido(a: any) { return a.cant_reorden ?? Math.max(1, a.stock_minimo * 2 - a.stock); }

  reponer(a: any) {
    this.dialog.open(MovimientoDialog, {
      maxWidth: '95vw',
      data: { articulo: a, tipo: 'entrada', cantidad: this.sugerido(a), motivo: 'Reposición por alerta de stock' },
    }).afterClosed().subscribe(r => r && this.cargar());
  }
}

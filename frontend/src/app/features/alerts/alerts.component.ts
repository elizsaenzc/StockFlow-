import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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
import { ArticuloDetalleDialog } from '../products/articulo-detalle.dialog';
import { ReposicionDialog, cantidadSugerida } from './reposicion.dialog';

@Component({
  selector: 'sf-alerts',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>Alertas de stock</h1>
        @if (!cargando() && articulos().length && auth.puedeEditar()) {
          <button mat-flat-button color="primary" (click)="reposicion()"><mat-icon>add_shopping_cart</mat-icon> Crear pedidos de reposición</button>
        }
      </div>

      @if (cargando()) {
        <div class="cargando"><mat-spinner diameter="40" /></div>
      } @else if (!articulos().length) {
        <mat-card class="sf-card"><div class="vacio"><mat-icon>task_alt</mat-icon>
          <div class="fuerte">Sin alertas</div>Todos los artículos están por encima de su stock mínimo.</div></mat-card>
      } @else {
        <div class="resumen">
          <mat-card class="sf-card"><div class="kpi">
            <span class="kpi-icon tone-danger"><mat-icon>block</mat-icon></span>
            <div><div class="kpi-label">Sin stock</div><div class="kpi-value">{{ sinStock().length }}</div></div>
          </div></mat-card>
          <mat-card class="sf-card"><div class="kpi">
            <span class="kpi-icon tone-warn"><mat-icon>warning</mat-icon></span>
            <div><div class="kpi-label">Bajo mínimo</div><div class="kpi-value">{{ bajo().length }}</div></div>
          </div></mat-card>
          <mat-card class="sf-card"><div class="kpi">
            <span class="kpi-icon tone-info"><mat-icon>local_shipping</mat-icon></span>
            <div><div class="kpi-label">Con pedido abierto</div><div class="kpi-value">{{ enCamino() }}</div>
              <div class="kpi-sub">no hace falta volver a pedirlos</div></div>
          </div></mat-card>
        </div>

        @for (grupo of grupos(); track grupo.titulo) {
          @if (grupo.lista.length) {
            <h2 class="grupo">{{ grupo.titulo }}</h2>
            <div class="cards-grid">
              @for (a of grupo.lista; track a.id) {
                <mat-card class="sf-card alerta clicable" (click)="ficha(a)">
                  <div class="cab">
                    <span class="app-ico lg" [class]="'app-ico lg ' + (a.stock === 0 ? 'bg-red' : 'bg-orange')">
                      <mat-icon>{{ a.stock === 0 ? 'block' : 'warning' }}</mat-icon>
                    </span>
                    <div class="titulos">
                      <div class="nombre">{{ a.nombre }}</div>
                      <div class="secundario">{{ a.referencia }} · {{ a.nombre_almacen }} · {{ a.ubicacion }}</div>
                    </div>
                  </div>
                  <div class="niveles">
                    <span><span class="cifra" [class.salida]="a.stock === 0">{{ a.stock | number }}</span> {{ a.unidad }}</span>
                    <span class="secundario">mínimo {{ a.stock_minimo }} {{ a.unidad }}</span>
                  </div>
                  <mat-progress-bar mode="determinate" [value]="nivel(a)" [color]="a.stock === 0 ? 'warn' : 'primary'" />
                  <div class="pie">
                    <span class="proveedor"><mat-icon>local_shipping</mat-icon>{{ a.nombre_proveedor }}</span>
                    @if (pendiente(a); as p) {
                      <span class="estado tone-info"><mat-icon>schedule</mat-icon>{{ p }} pedidas</span>
                    }
                  </div>
                  @if (auth.puedeMover()) {
                    <button mat-stroked-button class="reponer" (click)="$event.stopPropagation(); reponer(a)">
                      <mat-icon>add</mat-icon> Registrar entrada de {{ sugerido(a) }} {{ a.unidad }}
                    </button>
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
    .resumen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 8px; }
    .grupo { font-size: 20px; font-weight: 700; margin: 26px 0 12px; letter-spacing: -.01em; }
    .alerta { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .cab { display: flex; gap: 12px; align-items: flex-start; }
    .titulos { min-width: 0; }
    .nombre { font-weight: 600; font-size: 15px; line-height: 1.3; }
    .niveles { display: flex; justify-content: space-between; align-items: baseline; }
    .cifra { font-size: 28px; font-weight: 700; letter-spacing: -.02em; }
    .pie { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .proveedor { display: flex; align-items: center; gap: 6px; color: var(--sf-text-3); font-size: 13px; }
    .proveedor .mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .reponer { width: 100%; height: 40px; }
    @media (max-width: 600px) {
      .resumen { gap: 8px; }
      .resumen .mat-mdc-card { padding: 12px !important; }
      .resumen .kpi { flex-direction: column; align-items: flex-start; gap: 8px; }
      .resumen .kpi-icon { width: 32px; height: 32px; border-radius: 9px; }
      .resumen .kpi-sub { display: none; }
      .page-head { flex-wrap: wrap; gap: 10px; }
    }
  `],
})
export class AlertsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private avisos = inject(AvisosService);
  private router = inject(Router);

  articulos = signal<any[]>([]);
  private proveedores = signal<any[]>([]);
  private pendientes = signal<Map<number, number>>(new Map());
  cargando = signal(true);
  sinStock = computed(() => this.articulos().filter(a => a.stock === 0));
  bajo     = computed(() => this.articulos().filter(a => a.stock > 0));
  enCamino = computed(() => this.articulos().filter(a => this.pendientes().has(a.id)).length);
  grupos   = computed(() => [
    { titulo: 'Sin stock', lista: this.sinStock() },
    { titulo: 'Bajo mínimo', lista: this.bajo() },
  ]);

  ngOnInit() { this.cargar(); }

  cargar() {
    forkJoin([this.api.listarArticulos(), this.api.listarProveedores(), this.api.listarPedidos()]).subscribe({
      next: ([a, p, pedidos]) => {
        this.articulos.set(a.filter((x: any) => x.stock <= x.stock_minimo).sort((x: any, y: any) => x.stock - y.stock));
        this.proveedores.set(p);
        // Unidades pendientes de recibir por artículo (pedidos enviados o parciales)
        const pend = new Map<number, number>();
        pedidos.filter((x: any) => ['enviado', 'parcial', 'borrador'].includes(x.estado))
          .forEach((x: any) => x.lineas.forEach((l: any) =>
            pend.set(l.articulo_id, (pend.get(l.articulo_id) ?? 0) + l.cantidad_pedida - l.cantidad_recibida)));
        this.pendientes.set(pend);
        this.cargando.set(false);
      },
      error: e => { this.avisos.error(e); this.cargando.set(false); },
    });
  }

  nivel(a: any) { return Math.min(100, (a.stock / Math.max(1, a.stock_minimo)) * 100); }
  sugerido = cantidadSugerida;
  pendiente(a: any) { const n = this.pendientes().get(a.id); return n ? `${n} ${a.unidad}` : null; }

  ficha(a: any) {
    this.dialog.open(ArticuloDetalleDialog, { width: '860px', maxWidth: '95vw', data: { id: a.id } })
      .afterClosed().subscribe(() => this.cargar());
  }

  reponer(a: any) {
    this.dialog.open(MovimientoDialog, {
      maxWidth: '95vw',
      data: { articulo: a, tipo: 'entrada', cantidad: this.sugerido(a), motivo: 'Reposición por alerta de stock' },
    }).afterClosed().subscribe(r => r && this.cargar());
  }

  reposicion() {
    // Solo los artículos que aún no tienen pedido abierto
    const sinPedido = this.articulos().filter(a => !this.pendientes().has(a.id));
    if (!sinPedido.length) { this.avisos.ok('Todos los artículos en alerta ya tienen un pedido en curso'); return; }
    this.dialog.open(ReposicionDialog, { width: '720px', maxWidth: '95vw', data: { articulos: sinPedido, proveedores: this.proveedores() } })
      .afterClosed().subscribe(r => { if (r) { this.cargar(); this.router.navigate(['/pedidos']); } });
  }
}

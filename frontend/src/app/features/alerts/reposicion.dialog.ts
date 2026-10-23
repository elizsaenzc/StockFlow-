import { Component, Inject, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';

interface Linea { articulo: any; cantidad: number; }
interface Propuesta { proveedor_id: number; proveedor: string; plazo: number; incluir: boolean; lineas: Linea[]; }

/** Cantidad a pedir: la de reorden configurada o lo necesario para llegar al máximo. */
export function cantidadSugerida(a: any): number {
  const hastaMaximo = (a.stock_maximo ?? a.stock_minimo * 2) - a.stock;
  return Math.max(a.cant_reorden ?? 0, hastaMaximo, 1);
}

/** Propone un pedido en borrador por proveedor con todos sus artículos en alerta. */
@Component({
  selector: 'sf-reposicion',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatIconModule,
            MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Pedidos de reposición</h2>
    <mat-dialog-content>
      <p class="secundario intro">Se creará un pedido en borrador por proveedor. Revisa las cantidades antes de confirmar;
        después podrás enviarlo desde Pedidos de compra.</p>
      @for (p of propuestas(); track p.proveedor_id) {
        <section class="propuesta" [class.apagada]="!p.incluir">
          <header>
            <mat-checkbox [(ngModel)]="p.incluir" color="primary">
              <span class="fuerte">{{ p.proveedor }}</span>
            </mat-checkbox>
            <span class="secundario">entrega en {{ p.plazo }} días · {{ total(p) | currency }}</span>
          </header>
          @for (l of p.lineas; track l.articulo.id) {
            <div class="linea">
              <div class="info">
                <div>{{ l.articulo.nombre }}</div>
                <div class="secundario">{{ l.articulo.referencia }} · stock {{ l.articulo.stock }} / mín. {{ l.articulo.stock_minimo }} · {{ l.articulo.precio_coste | currency }}</div>
              </div>
              <mat-form-field class="cant densa">
                <input matInput type="number" min="1" [(ngModel)]="l.cantidad" [disabled]="!p.incluir" [attr.aria-label]="'Cantidad de ' + l.articulo.nombre" />
                <span matTextSuffix>{{ l.articulo.unidad }}</span>
              </mat-form-field>
            </div>
          }
        </section>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="crear()" [disabled]="guardando() || !seleccionadas()">
        Crear {{ seleccionadas() }} {{ seleccionadas() === 1 ? 'pedido' : 'pedidos' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .intro { margin: 0 0 12px; }
    .propuesta { background: var(--sf-bg); border-radius: 14px; padding: 10px 14px 4px; margin-bottom: 12px; transition: opacity .15s; }
    .propuesta.apagada { opacity: .5; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .linea { display: flex; align-items: center; gap: 12px; padding: 6px 0 6px 40px; border-top: 0.5px solid var(--sf-border); }
    .info { flex: 1; min-width: 0; }
    .cant { width: 110px; }
  `],
})
export class ReposicionDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<ReposicionDialog>);
  guardando = signal(false);
  propuestas = signal<Propuesta[]>([]);
  seleccionadas = () => this.propuestas().filter(p => p.incluir).length;

  constructor(@Inject(MAT_DIALOG_DATA) datos: { articulos: any[]; proveedores: any[] }) {
    const porProveedor = new Map<number, Propuesta>();
    for (const a of datos.articulos.filter(x => x.proveedor_id)) {
      const prov = datos.proveedores.find(p => p.id === a.proveedor_id);
      if (!porProveedor.has(a.proveedor_id))
        porProveedor.set(a.proveedor_id, { proveedor_id: a.proveedor_id, proveedor: prov?.nombre ?? a.nombre_proveedor,
                                           plazo: prov?.plazo_entrega ?? 7, incluir: true, lineas: [] });
      porProveedor.get(a.proveedor_id)!.lineas.push({ articulo: a, cantidad: cantidadSugerida(a) });
    }
    this.propuestas.set([...porProveedor.values()]);
  }

  total(p: Propuesta) { return p.lineas.reduce((s, l) => s + l.cantidad * l.articulo.precio_coste, 0); }

  crear() {
    const elegidas = this.propuestas().filter(p => p.incluir);
    this.guardando.set(true);
    const hoy = new Date();
    forkJoin(elegidas.map(p => {
      const entrega = new Date(hoy); entrega.setDate(hoy.getDate() + p.plazo);
      return this.api.crearPedido({
        proveedor_id: p.proveedor_id,
        almacen_id: p.lineas[0].articulo.almacen_id,
        fecha_esperada: entrega.toLocaleDateString('sv-SE'),
        notas: 'Reposición generada desde alertas de stock',
        lineas: p.lineas.map(l => ({ articulo_id: l.articulo.id, cantidad: Number(l.cantidad), precio_unitario: l.articulo.precio_coste })),
      });
    })).subscribe({
      next: pedidos => {
        this.avisos.ok(`${pedidos.length} ${pedidos.length === 1 ? 'pedido creado' : 'pedidos creados'} en borrador: ${pedidos.map(p => p.numero_pedido).join(', ')}`);
        this.ref.close(pedidos);
      },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

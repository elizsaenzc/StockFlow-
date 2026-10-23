import { Component, Inject, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';

export interface DatosMovimiento { articulo: any; tipo?: 'entrada' | 'salida' | 'ajuste'; cantidad?: number; motivo?: string; }

/** Entrada, salida o ajuste por recuento de un artículo. */
@Component({
  selector: 'sf-movimiento-dialog',
  standalone: true,
  imports: [DecimalPipe, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonToggleModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Registrar movimiento</h2>
    <mat-dialog-content>
      <div class="articulo">
        <div class="fuerte">{{ a.nombre }}</div>
        <div class="secundario">{{ a.referencia }} · stock actual {{ a.stock | number }} {{ a.unidad }} · mínimo {{ a.stock_minimo }}</div>
      </div>
      <mat-button-toggle-group [ngModel]="tipo()" (ngModelChange)="tipo.set($event)" class="tipos" aria-label="Tipo de movimiento">
        <mat-button-toggle value="entrada"><mat-icon>south_west</mat-icon> Entrada</mat-button-toggle>
        <mat-button-toggle value="salida"><mat-icon>north_east</mat-icon> Salida</mat-button-toggle>
        <mat-button-toggle value="ajuste"><mat-icon>tune</mat-icon> Ajuste</mat-button-toggle>
      </mat-button-toggle-group>
      <mat-form-field>
        <mat-label>{{ tipo() === 'ajuste' ? 'Recuento físico' : 'Cantidad' }}</mat-label>
        <input matInput type="number" min="0" [ngModel]="cantidad()" (ngModelChange)="cantidad.set($event)" />
        <span matTextSuffix>{{ a.unidad }}</span>
        <mat-hint>Stock resultante: {{ resultante() | number }} {{ a.unidad }}</mat-hint>
      </mat-form-field>
      <mat-form-field><mat-label>Motivo</mat-label><input matInput [(ngModel)]="motivo" /></mat-form-field>
      <mat-form-field><mat-label>Documento (albarán, pedido…)</mat-label><input matInput [(ngModel)]="referencia" /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando() || resultante() < 0">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { display: flex; flex-direction: column; gap: 12px; min-width: min(420px, 80vw); }
    .articulo { background: var(--sf-bg); border-radius: 8px; padding: 10px 12px; }
    .tipos { align-self: flex-start; }
    .tipos .mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: -4px; }
  `],
})
export class MovimientoDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<MovimientoDialog>);

  a: any;
  tipo = signal<'entrada' | 'salida' | 'ajuste'>('entrada');
  cantidad = signal<number>(1);
  motivo = '';
  referencia = '';
  guardando = signal(false);

  resultante = computed(() => {
    const c = Number(this.cantidad()) || 0;
    return this.tipo() === 'entrada' ? this.a.stock + c : this.tipo() === 'salida' ? this.a.stock - c : c;
  });

  constructor(@Inject(MAT_DIALOG_DATA) datos: DatosMovimiento) {
    this.a = datos.articulo;
    if (datos.tipo) this.tipo.set(datos.tipo);
    if (datos.cantidad) this.cantidad.set(datos.cantidad);
    this.motivo = datos.motivo ?? '';
  }

  guardar() {
    this.guardando.set(true);
    this.api.registrarMovimiento({
      articulo_id: this.a.id, tipo: this.tipo(), cantidad: Number(this.cantidad()),
      motivo: this.motivo || undefined, referencia: this.referencia || undefined,
    }).subscribe({
      next: m => { this.avisos.ok(`Movimiento registrado. Stock: ${m.stock_despues} ${this.a.unidad}`); this.ref.close(m); },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

import { Component, Inject, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { aIso } from '../../shared/fechas';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';
import { ESTADO_PEDIDO, desconocido } from '../../shared/estados';

/** Nuevo pedido de compra con líneas dinámicas (FormArray). */
@Component({
  selector: 'sf-pedido-nuevo',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatButtonModule, MatIconModule, MatTooltipModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>Nuevo pedido de compra</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="form-grid">
          <mat-form-field><mat-label>Proveedor</mat-label>
            <mat-select formControlName="proveedor_id">
              @for (p of datos.proveedores; track p.id) { <mat-option [value]="p.id">{{ p.nombre }}</mat-option> }
            </mat-select>
            @if (form.controls.proveedor_id.hasError('required')) { <mat-error>Elige un proveedor</mat-error> }
          </mat-form-field>
          <mat-form-field><mat-label>Almacén de destino</mat-label>
            <mat-select formControlName="almacen_id">
              @for (a of datos.almacenes; track a.id) { <mat-option [value]="a.id">{{ a.nombre }}</mat-option> }
            </mat-select></mat-form-field>
          <mat-form-field><mat-label>Entrega prevista</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="fecha_esperada" [min]="hoy" />
            <mat-datepicker-toggle matIconSuffix [for]="dp" /><mat-datepicker #dp /></mat-form-field>
          <mat-form-field><mat-label>Observaciones</mat-label><input matInput formControlName="notas" /></mat-form-field>
        </div>

        <div class="lineas-cab">
          <span class="fuerte">Líneas</span>
          <button mat-button type="button" color="primary" (click)="agregar()"><mat-icon>add</mat-icon> Añadir línea</button>
        </div>
        <div formArrayName="lineas">
          @for (l of lineas.controls; track l; let i = $index) {
            <div class="linea" [formGroupName]="i">
              <mat-form-field class="art"><mat-label>Artículo</mat-label>
                <mat-select formControlName="articulo_id" (selectionChange)="precioSugerido(i, $event.value)">
                  @for (a of articulosDelProveedor(); track a.id) { <mat-option [value]="a.id">{{ a.referencia }} · {{ a.nombre }}</mat-option> }
                </mat-select></mat-form-field>
              <mat-form-field class="cant"><mat-label>Cantidad</mat-label><input matInput type="number" min="1" formControlName="cantidad" /></mat-form-field>
              <mat-form-field class="precio"><mat-label>Precio</mat-label><input matInput type="number" min="0" step="0.01" formControlName="precio_unitario" /><span matTextSuffix>€</span></mat-form-field>
              <button mat-icon-button type="button" (click)="lineas.removeAt(i)" [disabled]="lineas.length === 1" matTooltip="Quitar línea" aria-label="Quitar línea"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </div>
        <div class="total">Total: <strong>{{ total() | currency }}</strong></div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Crear pedido</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .lineas-cab { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; }
    .linea { display: grid; grid-template-columns: minmax(0, 1fr) 100px 120px 40px; gap: 8px; align-items: start; }
    .total { text-align: right; font-size: 15px; margin-top: 8px; }
    @media (max-width: 600px) { .linea { grid-template-columns: 1fr 1fr; } .linea .art { grid-column: 1 / -1; } }
  `],
})
export class PedidoNuevoDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<PedidoNuevoDialog>);
  private fb = inject(FormBuilder);
  guardando = signal(false);
  hoy = new Date();

  form = this.fb.group({
    proveedor_id: [null as number | null, Validators.required],
    almacen_id: [null as number | null],
    fecha_esperada: [null as Date | null],
    notas: [''],
    lineas: this.fb.array([this.nuevaLinea()]),
  });
  get lineas() { return this.form.controls.lineas as FormArray; }

  private valor = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  total = computed(() => (this.valor().lineas ?? []).reduce((s: number, l: any) => s + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0));
  articulosDelProveedor = computed(() => {
    const prov = this.valor().proveedor_id;
    const todos = this.datos.articulos;
    const suyos = todos.filter((a: any) => a.proveedor_id === prov);
    return suyos.length ? suyos : todos;
  });

  constructor(@Inject(MAT_DIALOG_DATA) public datos: { proveedores: any[]; almacenes: any[]; articulos: any[] }) {}

  nuevaLinea() {
    return this.fb.group({
      articulo_id: [null as number | null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      precio_unitario: [0, [Validators.required, Validators.min(0)]],
    });
  }
  agregar() { this.lineas.push(this.nuevaLinea()); }

  precioSugerido(i: number, id: number) {
    const a = this.datos.articulos.find((x: any) => x.id === id);
    if (a) this.lineas.at(i).patchValue({ precio_unitario: a.precio_coste, cantidad: a.cant_reorden ?? 1 });
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.avisos.error(null, 'Completa proveedor y líneas'); return; }
    this.guardando.set(true);
    this.api.crearPedido({ ...this.form.value, fecha_esperada: aIso(this.form.value.fecha_esperada) || null }).subscribe({
      next: p => { this.avisos.ok(`Pedido ${p.numero_pedido} creado`); this.ref.close(p); },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

/** Detalle de un pedido con sus líneas. */
@Component({
  selector: 'sf-pedido-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>Pedido {{ p.numero_pedido }}</h2>
    <mat-dialog-content>
      <div class="datos">
        <div class="dato"><div class="k">Estado</div><div class="v"><span [class]="'estado ' + estado.tono"><mat-icon>{{ estado.icono }}</mat-icon>{{ estado.texto }}</span></div></div>
        <div class="dato"><div class="k">Proveedor</div><div class="v">{{ p.nombre_proveedor }}</div></div>
        <div class="dato"><div class="k">Almacén</div><div class="v">{{ p.nombre_almacen ?? '—' }}</div></div>
        <div class="dato"><div class="k">Entrega prevista</div><div class="v">{{ p.fecha_esperada ? (p.fecha_esperada | date:'d MMM y') : '—' }}</div></div>
        <div class="dato"><div class="k">Importe</div><div class="v">{{ p.importe_total | currency }}</div></div>
        <div class="dato"><div class="k">Creado por</div><div class="v">{{ p.creado_por_nombre ?? '—' }}</div></div>
      </div>
      @if (p.notas) { <p class="secundario">{{ p.notas }}</p> }
      <table mat-table [dataSource]="p.lineas" class="lineas">
        <ng-container matColumnDef="art"><th mat-header-cell *matHeaderCellDef>Artículo</th>
          <td mat-cell *matCellDef="let l"><div class="fuerte">{{ l.nombre_articulo }}</div><div class="secundario">{{ l.referencia }}</div></td></ng-container>
        <ng-container matColumnDef="pedida"><th mat-header-cell *matHeaderCellDef class="num">Pedido</th><td mat-cell *matCellDef="let l" class="num">{{ l.cantidad_pedida | number }} {{ l.unidad }}</td></ng-container>
        <ng-container matColumnDef="recibida"><th mat-header-cell *matHeaderCellDef class="num">Recibido</th>
          <td mat-cell *matCellDef="let l" class="num" [class.entrada]="l.cantidad_recibida >= l.cantidad_pedida">{{ l.cantidad_recibida | number }}</td></ng-container>
        <ng-container matColumnDef="precio"><th mat-header-cell *matHeaderCellDef class="num">Precio</th><td mat-cell *matCellDef="let l" class="num">{{ l.precio_unitario | currency }}</td></ng-container>
        <ng-container matColumnDef="subtotal"><th mat-header-cell *matHeaderCellDef class="num">Subtotal</th><td mat-cell *matCellDef="let l" class="num fuerte">{{ l.cantidad_pedida * l.precio_unitario | currency }}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let r; columns: cols"></tr>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>
  `,
  styles: [`.lineas { width: 100%; margin-top: 12px; }`],
})
export class PedidoDetalleDialog {
  cols = ['art', 'pedida', 'recibida', 'precio', 'subtotal'];
  estado;
  constructor(@Inject(MAT_DIALOG_DATA) public p: any) {
    this.estado = ESTADO_PEDIDO[p.estado] ?? desconocido(p.estado);
  }
}

/** Recepción (total o parcial) de un pedido: actualiza el stock. */
@Component({
  selector: 'sf-pedido-recepcion',
  standalone: true,
  imports: [DecimalPipe, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Recibir pedido {{ p.numero_pedido }}</h2>
    <mat-dialog-content>
      <p class="secundario">Indica lo que ha llegado. El stock se actualiza al confirmar y no se puede recibir más de lo pendiente.</p>
      @for (l of lineas; track l.linea_id) {
        <div class="linea">
          <div class="info">
            <div class="fuerte">{{ l.nombre }}</div>
            <div class="secundario">Pedido {{ l.pedida | number }} · ya recibido {{ l.recibida | number }} · pendiente {{ l.pedida - l.recibida | number }}</div>
          </div>
          <mat-form-field class="cant densa"><mat-label>Recibido ahora</mat-label>
            <input matInput type="number" min="0" [max]="l.pedida - l.recibida" [(ngModel)]="l.ahora" [disabled]="l.pedida - l.recibida <= 0" />
          </mat-form-field>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar()" [disabled]="guardando()"><mat-icon>inventory</mat-icon> Confirmar recepción</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .linea { display: flex; gap: 16px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--sf-border); }
    .info { flex: 1; min-width: 0; }
    .cant { width: 140px; }
  `],
})
export class PedidoRecepcionDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<PedidoRecepcionDialog>);
  guardando = signal(false);
  lineas: { linea_id: number; nombre: string; pedida: number; recibida: number; ahora: number }[];

  constructor(@Inject(MAT_DIALOG_DATA) public p: any) {
    this.lineas = p.lineas.map((l: any) => ({
      linea_id: l.id, nombre: l.nombre_articulo, pedida: l.cantidad_pedida, recibida: l.cantidad_recibida,
      ahora: l.cantidad_pedida - l.cantidad_recibida,
    }));
  }

  confirmar() {
    const lineas = this.lineas.filter(l => l.ahora > 0).map(l => ({ linea_id: l.linea_id, cantidad_recibida: Number(l.ahora) }));
    if (!lineas.length) { this.avisos.error(null, 'Indica al menos una cantidad recibida'); return; }
    this.guardando.set(true);
    this.api.recibirPedido(this.p.id, { lineas }).subscribe({
      next: r => { this.avisos.ok(r.estado === 'recibido' ? 'Pedido recibido completo' : 'Recepción parcial registrada'); this.ref.close(r); },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

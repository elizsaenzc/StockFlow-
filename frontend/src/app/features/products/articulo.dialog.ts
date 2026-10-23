import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';

export interface DatosArticulo { articulo?: any; familias: any[]; proveedores: any[]; almacenes: any[]; }

/** Alta y edición de artículos (formulario reactivo con validación). */
@Component({
  selector: 'sf-articulo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ datos.articulo ? 'Editar artículo' : 'Nuevo artículo' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field><mat-label>Referencia</mat-label><input matInput formControlName="referencia" />
          @if (form.controls.referencia.hasError('required')) { <mat-error>Obligatoria</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Código de barras (EAN-13)</mat-label><input matInput formControlName="cod_barras" /></mat-form-field>
        <mat-form-field class="full"><mat-label>Nombre</mat-label><input matInput formControlName="nombre" />
          @if (form.controls.nombre.hasError('required')) { <mat-error>Obligatorio</mat-error> }</mat-form-field>
        <mat-form-field class="full"><mat-label>Descripción</mat-label><input matInput formControlName="descripcion" /></mat-form-field>
        <mat-form-field><mat-label>Familia</mat-label>
          <mat-select formControlName="familia_id"><mat-option [value]="null">Sin asignar</mat-option>
            @for (f of datos.familias; track f.id) { <mat-option [value]="f.id">{{ f.nombre }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field><mat-label>Proveedor</mat-label>
          <mat-select formControlName="proveedor_id"><mat-option [value]="null">Sin asignar</mat-option>
            @for (p of datos.proveedores; track p.id) { <mat-option [value]="p.id">{{ p.nombre }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field><mat-label>Almacén</mat-label>
          <mat-select formControlName="almacen_id"><mat-option [value]="null">Sin asignar</mat-option>
            @for (a of datos.almacenes; track a.id) { <mat-option [value]="a.id">{{ a.nombre }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field><mat-label>Ubicación</mat-label><input matInput formControlName="ubicacion" placeholder="A-01-3" /></mat-form-field>
        <mat-form-field><mat-label>Unidad</mat-label>
          <mat-select formControlName="unidad">
            @for (u of unidades; track u.v) { <mat-option [value]="u.v">{{ u.t }}</mat-option> }</mat-select></mat-form-field>
        @if (!datos.articulo) {
          <mat-form-field><mat-label>Stock inicial</mat-label><input matInput type="number" min="0" formControlName="stock" /></mat-form-field>
        }
        <mat-form-field><mat-label>Stock mínimo</mat-label><input matInput type="number" min="0" formControlName="stock_minimo" /></mat-form-field>
        <mat-form-field><mat-label>Stock máximo</mat-label><input matInput type="number" min="0" formControlName="stock_maximo" /></mat-form-field>
        <mat-form-field><mat-label>Precio de coste</mat-label><input matInput type="number" min="0" step="0.01" formControlName="precio_coste" /><span matTextSuffix>€</span></mat-form-field>
        <mat-form-field><mat-label>Precio de venta</mat-label><input matInput type="number" min="0" step="0.01" formControlName="precio_venta" /><span matTextSuffix>€</span></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class ArticuloDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<ArticuloDialog>);
  guardando = signal(false);

  unidades = [
    { v: 'ud', t: 'Unidad (ud)' }, { v: 'cj', t: 'Caja (cj)' }, { v: 'bl', t: 'Bolsa (bl)' },
    { v: 'rl', t: 'Rollo (rl)' }, { v: 'kg', t: 'Kilogramo (kg)' }, { v: 'l', t: 'Litro (l)' }, { v: 'm', t: 'Metro (m)' },
  ];

  form = inject(FormBuilder).group({
    referencia:   ['', Validators.required],
    cod_barras:   [''],
    nombre:       ['', Validators.required],
    descripcion:  [''],
    familia_id:   [null as number | null],
    proveedor_id: [null as number | null],
    almacen_id:   [null as number | null],
    ubicacion:    [''],
    unidad:       ['ud'],
    stock:        [0, Validators.min(0)],
    stock_minimo: [0, [Validators.required, Validators.min(0)]],
    stock_maximo: [null as number | null, Validators.min(0)],
    precio_coste: [0, [Validators.required, Validators.min(0)]],
    precio_venta: [0, [Validators.required, Validators.min(0)]],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public datos: DatosArticulo) {
    if (datos.articulo) this.form.patchValue(datos.articulo);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const a = this.datos.articulo;
    const peticion = a ? this.api.actualizarArticulo(a.id, this.form.value) : this.api.crearArticulo(this.form.value);
    peticion.subscribe({
      next: r => { this.avisos.ok(a ? 'Artículo actualizado' : 'Artículo creado'); this.ref.close(r); },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

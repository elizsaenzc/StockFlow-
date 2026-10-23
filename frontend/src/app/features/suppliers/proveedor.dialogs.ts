import { Component, Inject, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AvisosService } from '../../shared/avisos.service';
import { ESTADO_PEDIDO, desconocido } from '../../shared/estados';

/** Alta y edición de proveedores. */
@Component({
  selector: 'sf-proveedor-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ datos ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field class="full"><mat-label>Razón social</mat-label><input matInput formControlName="nombre" />
          @if (form.controls.nombre.hasError('required')) { <mat-error>Obligatoria</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>Persona de contacto</mat-label><input matInput formControlName="contacto" /></mat-form-field>
        <mat-form-field><mat-label>Teléfono</mat-label><input matInput formControlName="telefono" /></mat-form-field>
        <mat-form-field><mat-label>Correo electrónico</mat-label><input matInput type="email" formControlName="correo" />
          @if (form.controls.correo.hasError('email')) { <mat-error>Correo no válido</mat-error> }</mat-form-field>
        <mat-form-field><mat-label>País</mat-label><input matInput formControlName="pais" /></mat-form-field>
        <mat-form-field class="full"><mat-label>Dirección</mat-label><input matInput formControlName="direccion" /></mat-form-field>
        <mat-form-field><mat-label>Plazo de entrega</mat-label><input matInput type="number" min="1" formControlName="plazo_entrega" /><span matTextSuffix>días</span></mat-form-field>
        <mat-form-field><mat-label>Condiciones de pago</mat-label><input matInput formControlName="condiciones_pago" /></mat-form-field>
        <mat-form-field><mat-label>Puntuación</mat-label><input matInput type="number" min="0" max="10" step="0.1" formControlName="puntuacion" /><span matTextSuffix>/ 10</span></mat-form-field>
        <mat-form-field class="full"><mat-label>Observaciones</mat-label><textarea matInput rows="2" formControlName="notas"></textarea></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="guardando()">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class ProveedorFormDialog {
  private api = inject(ApiService);
  private avisos = inject(AvisosService);
  private ref = inject(MatDialogRef<ProveedorFormDialog>);
  guardando = signal(false);

  form = inject(FormBuilder).group({
    nombre: ['', Validators.required], contacto: [''], telefono: [''], correo: ['', Validators.email],
    pais: ['España'], direccion: [''], plazo_entrega: [7, [Validators.required, Validators.min(1)]],
    condiciones_pago: ['Pago a 30 días'], puntuacion: [7, [Validators.min(0), Validators.max(10)]], notas: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public datos: any) {
    if (datos) this.form.patchValue(datos);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const peticion = this.datos ? this.api.actualizarProveedor(this.datos.id, this.form.value) : this.api.crearProveedor(this.form.value);
    peticion.subscribe({
      next: r => { this.avisos.ok(this.datos ? 'Proveedor actualizado' : 'Proveedor creado'); this.ref.close(r); },
      error: e => { this.avisos.error(e); this.guardando.set(false); },
    });
  }
}

/** Ficha del proveedor: datos, artículos que suministra y últimos pedidos. */
@Component({
  selector: 'sf-proveedor-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>{{ p.nombre }}</h2>
    <mat-dialog-content>
      <div class="datos">
        <div class="dato"><div class="k">Contacto</div><div class="v">{{ p.contacto ?? '—' }}</div></div>
        <div class="dato"><div class="k">Teléfono</div><div class="v">{{ p.telefono ?? '—' }}</div></div>
        <div class="dato"><div class="k">Correo</div><div class="v">{{ p.correo ?? '—' }}</div></div>
        <div class="dato"><div class="k">Plazo de entrega</div><div class="v">{{ p.plazo_entrega }} días</div></div>
        <div class="dato"><div class="k">Pago</div><div class="v">{{ p.condiciones_pago ?? '—' }}</div></div>
        <div class="dato"><div class="k">Puntuación</div><div class="v">{{ p.puntuacion | number:'1.1-1' }} / 10</div></div>
      </div>
      <mat-tab-group mat-stretch-tabs="false" class="pestanas">
        <mat-tab [label]="'Artículos (' + p.articulos.length + ')'">
          <table mat-table [dataSource]="p.articulos">
            <ng-container matColumnDef="ref"><th mat-header-cell *matHeaderCellDef>Referencia</th><td mat-cell *matCellDef="let a"><span class="ref">{{ a.referencia }}</span></td></ng-container>
            <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Artículo</th><td mat-cell *matCellDef="let a">{{ a.nombre }}</td></ng-container>
            <ng-container matColumnDef="stock"><th mat-header-cell *matHeaderCellDef class="num">Stock</th><td mat-cell *matCellDef="let a" class="num">{{ a.stock | number }}</td></ng-container>
            <ng-container matColumnDef="coste"><th mat-header-cell *matHeaderCellDef class="num">Coste</th><td mat-cell *matCellDef="let a" class="num">{{ a.precio_coste | currency }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['ref','nombre','stock','coste']"></tr>
            <tr mat-row *matRowDef="let r; columns: ['ref','nombre','stock','coste']"></tr>
          </table>
        </mat-tab>
        <mat-tab [label]="'Pedidos (' + p.pedidos.length + ')'">
          <table mat-table [dataSource]="p.pedidos">
            <ng-container matColumnDef="num"><th mat-header-cell *matHeaderCellDef>Pedido</th><td mat-cell *matCellDef="let x"><span class="ref">{{ x.numero_pedido }}</span></td></ng-container>
            <ng-container matColumnDef="estado"><th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let x"><span [class]="'estado ' + estado(x.estado).tono">{{ estado(x.estado).texto }}</span></td></ng-container>
            <ng-container matColumnDef="fecha"><th mat-header-cell *matHeaderCellDef>Previsto</th><td mat-cell *matCellDef="let x">{{ x.fecha_esperada | date:'d MMM y' }}</td></ng-container>
            <ng-container matColumnDef="importe"><th mat-header-cell *matHeaderCellDef class="num">Importe</th><td mat-cell *matCellDef="let x" class="num">{{ x.importe_total | currency }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="['num','estado','fecha','importe']"></tr>
            <tr mat-row *matRowDef="let r; columns: ['num','estado','fecha','importe']"></tr>
          </table>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>
  `,
  styles: [`.pestanas { margin-top: 16px; } table { width: 100%; }`],
})
export class ProveedorDetalleDialog {
  estado = (e: string) => ESTADO_PEDIDO[e] ?? desconocido(e);
  constructor(@Inject(MAT_DIALOG_DATA) public p: any) {}
}

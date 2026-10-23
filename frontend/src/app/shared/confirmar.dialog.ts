import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosConfirmacion { titulo: string; mensaje: string; accion: string; peligro?: boolean; }

@Component({
  selector: 'sf-confirmar',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <mat-dialog-content><p>{{ datos.mensaje }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button [color]="datos.peligro ? 'warn' : 'primary'" [mat-dialog-close]="true">{{ datos.accion }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public datos: DatosConfirmacion) {}
}

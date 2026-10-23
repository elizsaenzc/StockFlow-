import { Component, signal } from '@angular/core';
import { FormsModule }       from '@angular/forms';
import { Router }            from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule }     from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatListModule }     from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService }       from '../../core/services/auth.service';

@Component({
  selector: 'sf-login',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
            MatIconModule, MatListModule, MatProgressBarModule],
  template: `
    <div class="acceso">
      <mat-card class="caja">
        @if (cargando()) { <mat-progress-bar mode="indeterminate" /> }
        <mat-card-header>
          <div mat-card-avatar class="logo"><mat-icon>inventory_2</mat-icon></div>
          <mat-card-title>StockFlow</mat-card-title>
          <mat-card-subtitle>Gestión de almacén · Distribuciones Iberia</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="acceder()" class="form">
            <mat-form-field>
              <mat-label>Usuario</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput name="usuario" [(ngModel)]="nombreUsuario" autocomplete="username" required />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Contraseña</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput name="clave" [type]="ver() ? 'text' : 'password'" [(ngModel)]="contrasena"
                     autocomplete="current-password" required />
              <button mat-icon-button matSuffix type="button" (click)="ver.set(!ver())"
                      [attr.aria-label]="ver() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <mat-icon>{{ ver() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (error()) { <div class="error"><mat-icon>error</mat-icon>{{ error() }}</div> }
            <button mat-flat-button color="primary" type="submit" [disabled]="cargando()">Entrar</button>
          </form>
        </mat-card-content>

        <mat-card-content class="demo">
          <div class="demo-titulo">Usuarios de demostración</div>
          <mat-action-list>
            @for (u of usuariosPrueba; track u.usuario) {
              <button mat-list-item (click)="nombreUsuario = u.usuario; contrasena = u.clave">
                <mat-icon matListItemIcon>{{ u.icono }}</mat-icon>
                <span matListItemTitle>{{ u.nombre }}</span>
                <span matListItemLine>{{ u.rol }} · {{ u.usuario }}</span>
              </button>
            }
          </mat-action-list>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .acceso { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
              background: linear-gradient(180deg, #e8eaf6 0%, var(--sf-bg) 45%); box-sizing: border-box; }
    .caja { width: 100%; max-width: 420px; border: 1px solid var(--sf-border); overflow: hidden; }
    .logo { background: var(--sf-primary); color: #fff; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
    .form { display: flex; flex-direction: column; gap: 12px; padding-top: 16px; }
    .form button[type=submit] { height: 44px; }
    .error { display: flex; gap: 8px; align-items: center; color: var(--sf-danger); background: var(--sf-danger-bg);
             padding: 8px 12px; border-radius: 6px; font-size: 13px; }
    .error .mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .demo { border-top: 1px solid var(--sf-border); margin-top: 8px; padding-top: 8px; }
    .demo-titulo { font-size: 12px; color: var(--sf-text-3); padding: 8px 0 0; }
  `],
})
export class LoginComponent {
  nombreUsuario = '';
  contrasena    = '';
  cargando = signal(false);
  error    = signal('');
  ver      = signal(false);

  usuariosPrueba = [
    { usuario: 'admin',     clave: 'admin123',   nombre: 'Carlos Méndez',    rol: 'Administrador',          icono: 'admin_panel_settings' },
    { usuario: 'compras',   clave: 'compras123', nombre: 'Beatriz Sanz',     rol: 'Responsable de compras', icono: 'shopping_cart' },
    { usuario: 'almacen',   clave: 'almacen123', nombre: 'Francisco Molina', rol: 'Operario de almacén',    icono: 'forklift' },
    { usuario: 'consultor', clave: 'visor123',   nombre: 'Pedro Ibáñez',     rol: 'Consultor (solo lectura)', icono: 'visibility' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  acceder() {
    if (!this.nombreUsuario || !this.contrasena) { this.error.set('Introduce usuario y contraseña'); return; }
    this.error.set('');
    this.cargando.set(true);
    this.auth.iniciarSesion(this.nombreUsuario.trim(), this.contrasena).subscribe({
      next: () => this.router.navigate(['/']),
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 401 ? 'Usuario o contraseña incorrectos'
          : 'No se pudo conectar. Si la demo llevaba un rato sin uso, tarda unos segundos en arrancar.');
        this.cargando.set(false);
      },
    });
  }
}

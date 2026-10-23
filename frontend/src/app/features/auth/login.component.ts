import { Component, signal } from '@angular/core';
import { FormsModule }       from '@angular/forms';
import { Router }            from '@angular/router';
import { AuthService }       from '../../core/services/auth.service';

@Component({
  selector: 'sf-login', standalone: true, imports: [FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-box">
        <div class="auth-header">
          <div class="auth-logo">
            <div class="logo-mark">S</div>
            <div class="logo-name" style="font-size:17px">StockFlow</div>
          </div>
          <div class="auth-title">Acceso al sistema</div>
          <div class="auth-sub">Distribuciones Iberia &mdash; Gestión de almacén</div>
        </div>

        @if (error()) {
          <div class="auth-error">{{ error() }}</div>
        }

        <form (ngSubmit)="acceder()" style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;flex-direction:column;gap:5px">
            <label class="form-label">Usuario</label>
            <input class="sf-input" [(ngModel)]="nombreUsuario" name="nombre_usuario"
                   placeholder="nombre.apellido" autocomplete="username" required />
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <label class="form-label">Contraseña</label>
            <input class="sf-input" type="password" [(ngModel)]="contrasena" name="contrasena"
                   placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-jade"
                  [disabled]="cargando()"
                  style="justify-content:center;padding:10px;margin-top:4px;font-size:14px;font-weight:700">
            {{ cargando() ? 'Verificando...' : 'Entrar' }}
          </button>
        </form>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
          <p style="font-size:10px;color:var(--chalk3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Usuarios de prueba</p>
          <div style="display:flex;flex-direction:column;gap:5px">
            @for (u of usuariosPrueba; track u.usuario) {
              <button (click)="nombreUsuario=u.usuario;contrasena=u.clave"
                      style="border:1px solid var(--line);border-radius:6px;padding:6px 10px;background:none;cursor:pointer;display:flex;justify-content:space-between;font-size:12px;color:var(--chalk2);font-family:inherit;text-align:left">
                <span>{{ u.etiqueta }}</span>
                <span style="color:var(--chalk3);font-family:'JetBrains Mono',monospace">{{ u.usuario }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  nombreUsuario = 'admin';
  contrasena    = 'admin123';
  cargando = signal(false);
  error    = signal('');

  usuariosPrueba = [
    { usuario: 'admin',     clave: 'admin123',   etiqueta: 'Carlos Méndez — Administrador' },
    { usuario: 'compras',   clave: 'compras123', etiqueta: 'Beatriz Sanz — Resp. de Compras' },
    { usuario: 'almacen',   clave: 'almacen123', etiqueta: 'Francisco Molina — Operario' },
    { usuario: 'consultor', clave: 'visor123',   etiqueta: 'Pedro Ibáñez — Consultor' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  acceder() {
    this.error.set('');
    this.cargando.set(true);
    this.auth.iniciarSesion(this.nombreUsuario, this.contrasena).subscribe({
      next:  () => this.router.navigate(['/']),
      error: () => { this.error.set('Usuario o contraseña incorrectos'); this.cargando.set(false); }
    });
  }
}

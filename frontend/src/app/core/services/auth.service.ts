import { Injectable, signal }      from '@angular/core';
import { HttpClient }              from '@angular/common/http';
import { Router }                  from '@angular/router';
import { tap }                     from 'rxjs';

export interface Usuario {
  id: number;
  nombre_usuario: string;
  rol: 'administrador' | 'responsable' | 'operario' | 'consultor';
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private T = 'sf_token';
  private U = 'sf_usuario';

  usuarioActual = signal<Usuario | null>(this._cargar());

  constructor(private http: HttpClient, private router: Router) {}

  iniciarSesion(nombre_usuario: string, contrasena: string) {
    return this.http.post<{ token: string; usuario: Usuario }>('/api/sesion', { nombre_usuario, contrasena }).pipe(
      tap(r => {
        localStorage.setItem(this.T, r.token);
        localStorage.setItem(this.U, JSON.stringify(r.usuario));
        this.usuarioActual.set(r.usuario);
      })
    );
  }

  cerrarSesion() {
    localStorage.removeItem(this.T);
    localStorage.removeItem(this.U);
    this.usuarioActual.set(null);
    this.router.navigate(['/acceso']);
  }

  getToken()      { return localStorage.getItem(this.T); }
  estaAutenticado() { return !!this.getToken(); }
  puedeEditar()   { const r = this.usuarioActual()?.rol; return r === 'administrador' || r === 'responsable'; }
  esAdmin()       { return this.usuarioActual()?.rol === 'administrador'; }

  private _cargar(): Usuario | null {
    const raw = localStorage.getItem(this.U);
    return raw ? JSON.parse(raw) : null;
  }
}

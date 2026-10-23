import { Injectable, computed, signal } from '@angular/core';
import { HttpClient }                   from '@angular/common/http';
import { Router }                       from '@angular/router';
import { tap }                          from 'rxjs';

export type Rol = 'administrador' | 'responsable' | 'operario' | 'consultor';

export interface Usuario {
  id: number;
  nombre_usuario: string;
  rol: Rol;
  nombre: string;
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  responsable:   'Responsable de compras',
  operario:      'Operario de almacén',
  consultor:     'Consultor',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly T = 'sf_token';
  private readonly U = 'sf_usuario';

  readonly usuarioActual = signal<Usuario | null>(this.cargar());
  /** Gestiona catálogo, proveedores y pedidos */
  readonly puedeEditar = computed(() => ['administrador', 'responsable'].includes(this.usuarioActual()?.rol ?? ''));
  /** Registra entradas, salidas y recepciones */
  readonly puedeMover  = computed(() => ['administrador', 'responsable', 'operario'].includes(this.usuarioActual()?.rol ?? ''));

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

  getToken()        { return localStorage.getItem(this.T); }
  estaAutenticado() { return !!this.getToken() && !!this.usuarioActual(); }

  private cargar(): Usuario | null {
    try {
      const raw = localStorage.getItem(this.U);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

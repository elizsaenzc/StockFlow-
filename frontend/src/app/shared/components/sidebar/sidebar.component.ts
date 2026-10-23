import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService }        from '../../../core/services/auth.service';
import { DomSanitizer }       from '@angular/platform-browser';

// Iconos SVG dibujados a mano — stroke, sin relleno, 20×20px
const ICONOS: Record<string, string> = {
  panel:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  articulos:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  movimientos:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3 21 7l-4 4"/><path d="M21 7H9"/><path d="m7 21-4-4 4-4"/><path d="M3 17h12"/></svg>`,
  alertas:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m10.29 3.86-8.6 14.9A1 1 0 0 0 2.57 20H21.4a1 1 0 0 0 .86-1.5l-8.58-14.9a1 1 0 0 0-1.74 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  proveedores:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  pedidos:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  analiticas: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  salir:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

const COLORES_NAV: Record<string, string> = {
  panel: 'var(--cobalt)', articulos: 'var(--jade)', movimientos: 'var(--violet)',
  alertas: 'var(--coral)', proveedores: 'var(--sky)', pedidos: 'var(--amber)', analiticas: 'var(--cobalt)',
};

const AV_COLORES = ['#4D7EFF','#00C48C','#9B6DFF','#F5A623','#FF5757','#29C6E8'];

@Component({
  selector:   'sf-sidebar',
  standalone: true,
  imports:    [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">S</div>
        <div>
          <div class="logo-name">StockFlow</div>
          <div class="logo-tagline">Gestión de almacén</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-label">Inicio</div>
        <a routerLink="/panel" routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('panel')"></span> Panel de control
        </a>

        <div class="nav-label">Almacén</div>
        <a routerLink="/articulos"   routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('articulos')"></span> Artículos
        </a>
        <a routerLink="/movimientos" routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('movimientos')"></span> Movimientos
        </a>
        <a routerLink="/alertas"     routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('alertas')"></span> Alertas de stock
        </a>

        <div class="nav-label">Compras</div>
        <a routerLink="/proveedores" routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('proveedores')"></span> Proveedores
        </a>
        <a routerLink="/pedidos"     routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('pedidos')"></span> Pedidos de compra
        </a>

        <div class="nav-label">Informes</div>
        <a routerLink="/analiticas"  routerLinkActive="active" class="nav-item">
          <span class="nav-ico" [innerHTML]="icono('analiticas')"></span> Analíticas
        </a>
      </nav>

      <div class="sidebar-user">
        <div class="user-av" [style.background]="colorAvatar()">
          {{ inicial() }}
        </div>
        <div>
          <div class="uname">{{ usuario()?.nombre_usuario }}</div>
          <div class="urole">{{ etiquetaRol() }}</div>
        </div>
        <button class="logout-btn" (click)="auth.cerrarSesion()" title="Cerrar sesión"
                [innerHTML]="icono('salir')">
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .nav-ico { display: flex; align-items: center; flex-shrink: 0; }
    .nav-ico ::ng-deep svg { transition: stroke .15s; }
  `]
})
export class SidebarComponent {
  usuario     = computed(() => this.auth.usuarioActual());
  inicial     = computed(() => this.usuario()?.nombre_usuario?.[0]?.toUpperCase() ?? 'U');
  colorAvatar = computed(() => AV_COLORES[(this.usuario()?.nombre_usuario?.charCodeAt(0) ?? 0) % AV_COLORES.length]);
  etiquetaRol = computed(() => {
    const mapa: Record<string, string> = {
      administrador: 'Administrador', responsable: 'Resp. de Compras',
      operario: 'Operario Almacén', consultor: 'Consultor externo'
    };
    return mapa[this.usuario()?.rol ?? ''] ?? '';
  });

  constructor(public auth: AuthService, private san: DomSanitizer) {}

  icono(nombre: string) {
    return this.san.bypassSecurityTrustHtml(ICONOS[nombre] ?? '');
  }
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService, ETIQUETA_ROL } from '../core/services/auth.service';

interface Enlace { ruta: string; texto: string; icono: string; }

@Component({
  selector: 'sf-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule,
            MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #nav [mode]="movil() ? 'over' : 'side'" [opened]="!movil()" class="nav sf-nav" [fixedInViewport]="movil()">
        <div class="marca">
          <span class="marca-logo"><mat-icon>inventory_2</mat-icon></span>
          <div>
            <div class="marca-nombre">StockFlow</div>
            <div class="marca-sub">Distribuciones Iberia</div>
          </div>
        </div>

        @for (grupo of menu; track grupo.titulo) {
          <mat-nav-list>
            <div mat-subheader>{{ grupo.titulo }}</div>
            @for (e of grupo.enlaces; track e.ruta) {
              <a mat-list-item [routerLink]="e.ruta" routerLinkActive #rla="routerLinkActive"
                 [activated]="rla.isActive" (click)="movil() && nav.close()">
                <mat-icon matListItemIcon>{{ e.icono }}</mat-icon>
                <span matListItemTitle>{{ e.texto }}</span>
              </a>
            }
          </mat-nav-list>
        }
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="barra">
          @if (movil()) {
            <button mat-icon-button (click)="nav.toggle()" aria-label="Abrir menú"><mat-icon>menu</mat-icon></button>
          }
          <span class="spacer"></span>
          <button mat-button [matMenuTriggerFor]="menuUsuario" class="usuario">
            <span class="avatar">{{ iniciales() }}</span>
            <span class="usuario-txt">
              <span class="usuario-nombre">{{ auth.usuarioActual()?.nombre }}</span>
              <span class="usuario-rol">{{ rol() }}</span>
            </span>
            <mat-icon iconPositionEnd>expand_more</mat-icon>
          </button>
          <mat-menu #menuUsuario="matMenu" xPosition="before">
            <div class="menu-cabecera">
              <div class="fuerte">{{ auth.usuarioActual()?.nombre }}</div>
              <div class="secundario">{{ auth.usuarioActual()?.nombre_usuario }} · {{ rol() }}</div>
            </div>
            <mat-divider />
            <button mat-menu-item (click)="auth.cerrarSesion()">
              <mat-icon>logout</mat-icon><span>Cerrar sesión</span>
            </button>
          </mat-menu>
        </mat-toolbar>
        <main><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell { height: 100vh; background: var(--sf-bg); }
    .nav { width: 248px; border-right: 1px solid var(--sf-border); background: var(--sf-surface); }
    .marca { display: flex; align-items: center; gap: 12px; padding: 18px 16px 10px; }
    .marca-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--sf-primary); color: #fff;
                  display: flex; align-items: center; justify-content: center; }
    .marca-nombre { font-weight: 500; font-size: 17px; }
    .marca-sub { font-size: 12px; color: var(--sf-text-3); }
    mat-nav-list { padding-top: 0; }
    [mat-subheader] { height: 36px !important; font-size: 12px; font-weight: 500; color: var(--sf-text-3) !important; }
    .mat-mdc-list-item { border-radius: 0 24px 24px 0; margin-right: 12px; --mdc-list-list-item-label-text-size: 14px; --mdc-list-list-item-label-text-tracking: normal; }
    .mat-mdc-list-item.mdc-list-item--activated { background: var(--sf-primary-50); }
    .mat-mdc-list-item.mdc-list-item--activated .mat-icon,
    .mat-mdc-list-item.mdc-list-item--activated .mdc-list-item__primary-text { color: var(--sf-primary); }
    .barra { position: sticky; top: 0; z-index: 10; background: var(--sf-surface); border-bottom: 1px solid var(--sf-border); height: 60px; }
    .usuario { height: 48px; letter-spacing: normal; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--sf-primary-50); color: var(--sf-primary);
              display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; margin-right: 10px; }
    .usuario-txt { display: inline-flex; flex-direction: column; text-align: left; line-height: 1.2; }
    .usuario-nombre { font-size: 14px; color: var(--sf-text); }
    .usuario-rol { font-size: 12px; color: var(--sf-text-3); }
    .menu-cabecera { padding: 10px 16px 12px; }
    @media (max-width: 600px) { .usuario-txt { display: none; } .avatar { margin-right: 0; } }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  movil = toSignal(inject(BreakpointObserver).observe('(max-width: 960px)').pipe(map(r => r.matches)), { initialValue: false });
  rol = computed(() => ETIQUETA_ROL[this.auth.usuarioActual()?.rol ?? 'consultor']);
  iniciales = computed(() => (this.auth.usuarioActual()?.nombre ?? 'U').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase());

  menu: { titulo: string; enlaces: Enlace[] }[] = [
    { titulo: 'General', enlaces: [{ ruta: '/panel', texto: 'Panel', icono: 'dashboard' }] },
    { titulo: 'Almacén', enlaces: [
      { ruta: '/articulos',   texto: 'Artículos',        icono: 'inventory_2' },
      { ruta: '/movimientos', texto: 'Movimientos',      icono: 'swap_horiz' },
      { ruta: '/alertas',     texto: 'Alertas de stock', icono: 'notification_important' },
    ] },
    { titulo: 'Compras', enlaces: [
      { ruta: '/proveedores', texto: 'Proveedores',       icono: 'local_shipping' },
      { ruta: '/pedidos',     texto: 'Pedidos de compra', icono: 'receipt_long' },
    ] },
    { titulo: 'Informes', enlaces: [{ ruta: '/analiticas', texto: 'Analíticas', icono: 'insights' }] },
  ];
}

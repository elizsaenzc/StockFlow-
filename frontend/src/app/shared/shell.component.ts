import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { AuthService, ETIQUETA_ROL } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';
import { ArticuloDetalleDialog } from '../features/products/articulo-detalle.dialog';

interface Enlace { ruta: string; texto: string; icono: string; color: string; }

@Component({
  selector: 'sf-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, MatSidenavModule, MatToolbarModule, MatListModule,
            MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule, MatBadgeModule,
            MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #nav [mode]="movil() ? 'over' : 'side'" [opened]="!movil()" class="nav sf-nav" [fixedInViewport]="movil()">
        <div class="marca">
          <span class="app-ico lg bg-blue"><mat-icon>inventory_2</mat-icon></span>
          <div>
            <div class="marca-nombre">StockFlow</div>
            <div class="marca-sub">Distribuciones Iberia</div>
          </div>
        </div>

        @for (grupo of menu; track grupo.titulo) {
          <div class="grupo-titulo">{{ grupo.titulo }}</div>
          <mat-nav-list class="grupo">
            @for (e of grupo.enlaces; track e.ruta) {
              <a mat-list-item [routerLink]="e.ruta" routerLinkActive #rla="routerLinkActive"
                 [activated]="rla.isActive" (click)="movil() && nav.close()">
                <span matListItemIcon class="app-ico" [class]="'app-ico ' + e.color"><mat-icon>{{ e.icono }}</mat-icon></span>
                <span matListItemTitle>{{ e.texto }}</span>
                @if (e.ruta === '/alertas' && alertas() > 0) {
                  <span matListItemMeta class="contador">{{ alertas() }}</span>
                }
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
          <div class="buscador">
            <mat-icon class="lupa">search</mat-icon>
            <input type="search" placeholder="Buscar artículo, referencia o EAN" aria-label="Buscar artículo"
                   [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" (focus)="refrescarArticulos()"
                   [matAutocomplete]="auto" />
            <mat-autocomplete #auto="matAutocomplete" [displayWith]="vacio" (optionSelected)="abrirArticulo($event.option.value)" class="resultados">
              @for (a of resultados(); track a.id) {
                <mat-option [value]="a">
                  <div class="opcion">
                    <span class="fuerte">{{ a.nombre }}</span>
                    <span class="secundario">{{ a.referencia }} · {{ a.stock }} {{ a.unidad }} · {{ a.nombre_almacen }}</span>
                  </div>
                </mat-option>
              }
              @if (busqueda().length > 1 && !resultados().length) {
                <mat-option disabled>Sin resultados</mat-option>
              }
            </mat-autocomplete>
          </div>
          <span class="spacer"></span>
          <a mat-icon-button routerLink="/alertas" matTooltip="Alertas de stock" aria-label="Alertas de stock">
            <mat-icon [matBadge]="alertas() || null" matBadgeColor="warn" matBadgeSize="small" aria-hidden="false">notifications</mat-icon>
          </a>
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
            <button mat-menu-item (click)="auth.cerrarSesion()"><mat-icon>logout</mat-icon><span>Cerrar sesión</span></button>
          </mat-menu>
        </mat-toolbar>
        <main><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell { height: 100vh; background: var(--sf-bg); }
    .nav { width: 264px; border-right: 0.5px solid var(--sf-border); background: rgba(246, 246, 248, .92); backdrop-filter: blur(20px); }
    .marca { display: flex; align-items: center; gap: 12px; padding: 20px 20px 14px; }
    .marca-nombre { font-weight: 700; font-size: 18px; letter-spacing: -.02em; }
    .marca-sub { font-size: 12px; color: var(--sf-text-3); }
    .grupo-titulo { padding: 14px 26px 6px; font-size: 12px; font-weight: 600; color: var(--sf-text-3); text-transform: uppercase; letter-spacing: .02em; }
    .grupo { margin: 0 12px; padding: 4px 0; background: var(--sf-surface); border-radius: 12px; box-shadow: 0 0.5px 0 var(--sf-border); }
    .grupo .mat-mdc-list-item { border-radius: 10px; margin: 0 4px; padding-left: 10px !important;
      --mdc-list-list-item-label-text-size: 15px; --mdc-list-list-item-one-line-container-height: 44px; }
    .grupo .mat-mdc-list-item.mdc-list-item--activated { background: var(--sf-primary-50); }
    .grupo .mat-mdc-list-item.mdc-list-item--activated .mdc-list-item__primary-text { color: var(--ios-blue-text); font-weight: 600; }
    .grupo .mat-mdc-list-item .app-ico { margin-right: 14px !important; }
    .contador { background: var(--ios-red); color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 12px; font-weight: 600; }

    .barra { position: sticky; top: 0; z-index: 10; height: 60px; gap: 8px;
             background: rgba(242, 242, 247, .78); backdrop-filter: saturate(180%) blur(20px);
             border-bottom: 0.5px solid var(--sf-border); }
    .buscador { position: relative; display: flex; align-items: center; width: min(420px, 50vw); }
    .buscador input { width: 100%; height: 36px; border: none; border-radius: 10px; background: var(--sf-fill);
                      padding: 0 12px 0 36px; font: inherit; font-size: 15px; color: var(--sf-text); outline: none; }
    .buscador input:focus { box-shadow: 0 0 0 3px rgba(0, 122, 255, .25); background: #fff; }
    .lupa { position: absolute; left: 9px; color: var(--sf-text-3); font-size: 20px; width: 20px; height: 20px; }
    .opcion { display: flex; flex-direction: column; line-height: 1.3; padding: 4px 0; }
    .usuario { height: 48px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #5ac8fa, #007aff); color: #fff;
              display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; margin-right: 10px; }
    .usuario-txt { display: inline-flex; flex-direction: column; text-align: left; line-height: 1.2; }
    .usuario-nombre { font-size: 14px; color: var(--sf-text); font-weight: 600; }
    .usuario-rol { font-size: 12px; color: var(--sf-text-3); font-weight: 400; }
    .menu-cabecera { padding: 10px 16px 12px; }
    @media (max-width: 600px) { .usuario-txt { display: none; } .avatar { margin-right: 0; } .buscador { width: 100%; } }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  movil = toSignal(inject(BreakpointObserver).observe('(max-width: 960px)').pipe(map(r => r.matches)), { initialValue: false });
  rol = computed(() => ETIQUETA_ROL[this.auth.usuarioActual()?.rol ?? 'consultor']);
  iniciales = computed(() => (this.auth.usuarioActual()?.nombre ?? 'U').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase());

  private articulos = signal<any[]>([]);
  busqueda = signal('');
  vacio = () => '';
  alertas = computed(() => this.articulos().filter(a => a.stock <= a.stock_minimo).length);
  resultados = computed(() => {
    const t = (typeof this.busqueda() === 'string' ? this.busqueda() : '').trim().toLowerCase();
    if (t.length < 2) return [];
    return this.articulos()
      .filter(a => `${a.nombre} ${a.referencia} ${a.cod_barras ?? ''}`.toLowerCase().includes(t))
      .slice(0, 8);
  });

  menu: { titulo: string; enlaces: Enlace[] }[] = [
    { titulo: 'General', enlaces: [{ ruta: '/panel', texto: 'Panel', icono: 'space_dashboard', color: 'bg-blue' }] },
    { titulo: 'Almacén', enlaces: [
      { ruta: '/articulos',   texto: 'Artículos',        icono: 'inventory_2',   color: 'bg-indigo' },
      { ruta: '/movimientos', texto: 'Movimientos',      icono: 'swap_horiz',    color: 'bg-teal' },
      { ruta: '/alertas',     texto: 'Alertas de stock', icono: 'warning',       color: 'bg-red' },
    ] },
    { titulo: 'Compras', enlaces: [
      { ruta: '/proveedores', texto: 'Proveedores',       icono: 'local_shipping', color: 'bg-orange' },
      { ruta: '/pedidos',     texto: 'Pedidos de compra', icono: 'receipt_long',   color: 'bg-green' },
    ] },
    { titulo: 'Informes', enlaces: [{ ruta: '/analiticas', texto: 'Analíticas', icono: 'monitoring', color: 'bg-purple' }] },
  ];

  constructor() {
    // El contador de alertas se actualiza al navegar (tras registrar movimientos, recepciones…)
    this.refrescarArticulos();
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.refrescarArticulos());
  }

  refrescarArticulos() {
    this.api.listarArticulos().subscribe({ next: a => this.articulos.set(a), error: () => {} });
  }

  abrirArticulo(a: any) {
    this.busqueda.set('');
    this.dialog.open(ArticuloDetalleDialog, { width: '860px', maxWidth: '95vw', data: { id: a.id } })
      .afterClosed().subscribe(() => this.refrescarArticulos());
  }
}

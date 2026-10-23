import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ApiService }                from '../../core/services/api.service';
import { AuthService }               from '../../core/services/auth.service';

@Component({
  selector: 'sf-products', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Catálogo de artículos</span>
      <div class="topbar-right">
        @if (auth.puedeEditar()) {
          <button class="btn btn-jade" (click)="abrirCrear()">Nuevo artículo</button>
        }
      </div>
    </div>

    <div class="page section-gap">
      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-ico" style="font-size:12px">&#9906;</span>
          <input class="sf-input" placeholder="Referencia, nombre o código de barras..."
                 [(ngModel)]="filtros.q" (ngModelChange)="resetearYcargar()" />
        </div>
        <select class="sf-input" style="width:auto" [(ngModel)]="filtros.familia" (ngModelChange)="resetearYcargar()">
          <option value="">Todas las familias</option>
          @for (f of familias(); track f.id) { <option [value]="f.id">{{ f.nombre }}</option> }
        </select>
        <select class="sf-input" style="width:auto" [(ngModel)]="filtros.proveedor" (ngModelChange)="resetearYcargar()">
          <option value="">Todos los proveedores</option>
          @for (p of proveedores(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
        </select>
        <select class="sf-input" style="width:auto" [(ngModel)]="filtros.almacen" (ngModelChange)="resetearYcargar()">
          <option value="">Todos los almacenes</option>
          @for (a of almacenes(); track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
        </select>
        <select class="sf-input" style="width:auto" [(ngModel)]="filtros.estado_stock" (ngModelChange)="resetearYcargar()">
          <option value="">Todos los estados</option>
          <option value="correcto">Stock correcto</option>
          <option value="bajo">Stock bajo</option>
          <option value="sin_stock">Sin stock</option>
        </select>
        <div class="spacer"></div>
        <span class="text-sm text-muted">{{ articulos().length }} de {{ totalArticulos() }} artículos</span>
        @if (totalArticulos() > pageSize) {
          <div class="pagination-controls">
            <button class="btn btn-ghost btn-sm" [disabled]="pagina() === 1" (click)="irPagina(pagina() - 1)">Anterior</button>
            <span class="text-sm text-muted">Página {{ pagina() }} de {{ totalPaginas() }}</span>
            <button class="btn btn-ghost btn-sm" [disabled]="pagina() === totalPaginas()" (click)="irPagina(pagina() + 1)">Siguiente</button>
          </div>
        }
      </div>

      <div class="card" style="padding:0">
        @if (cargando()) {
          <div class="spinner-wrap"><div class="spinner"></div></div>
        } @else if (!articulos().length) {
          <div class="empty-box"><div class="empty-icon" style="font-size:28px">&#9723;</div><div>Sin artículos para los filtros aplicados</div></div>
        } @else {
          <div class="tbl-wrap">
            <table class="sf-tbl">
              <thead>
                <tr>
                  <th>Referencia</th><th>Artículo</th><th>Familia</th>
                  <th>Proveedor</th><th>Ubicación</th>
                  <th>Stock</th><th class="text-right">Coste</th><th class="text-right">P.V.P.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (a of articulos(); track a.id) {
                  <tr>
                    <td>
                      <div class="mono" style="font-size:11px;color:var(--cobalt);font-weight:600">{{ a.referencia }}</div>
                      @if (a.cod_barras) { <div class="mono text-muted" style="font-size:9px">{{ a.cod_barras }}</div> }
                    </td>
                    <td>
                      <div style="font-weight:500;font-size:13px">{{ a.nombre }}</div>
                      @if (a.descripcion) { <div class="text-sm text-muted">{{ a.descripcion }}</div> }
                    </td>
                    <td>
                      @if (a.nombre_familia) {
                        <span class="badge" [style.background]="a.color_familia + '22'" [style.color]="a.color_familia">
                          {{ a.nombre_familia }}
                        </span>
                      }
                    </td>
                    <td class="text-sm text-muted">{{ a.nombre_proveedor ?? '—' }}</td>
                    <td>
                      <div class="text-sm">{{ a.nombre_almacen ?? '—' }}</div>
                      @if (a.ubicacion) { <div class="mono text-muted" style="font-size:10px">{{ a.ubicacion }}</div> }
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="stock-bg">
                          <div class="stock-fill" [class]="'fill-' + claseStock(a)" [style.width]="pctStock(a) + '%'"></div>
                        </div>
                        <span class="mono fw-600" [style.color]="colorStock(a)">
                          {{ a.stock }} <span style="font-weight:400;color:var(--chalk3)">{{ a.unidad }}</span>
                        </span>
                      </div>
                      <div style="font-size:10px;color:var(--chalk3)">mín. {{ a.stock_minimo }}</div>
                    </td>
                    <td class="mono text-right">{{ a.precio_coste | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                    <td class="mono text-right">{{ a.precio_venta | currency:'EUR':'symbol':'1.2-2':'es' }}</td>
                    <td>
                      <div style="display:flex;gap:5px">
                        <button class="btn btn-ghost btn-sm" (click)="abrirMovimiento(a)">Mover</button>
                        @if (auth.puedeEditar()) {
                          <button class="btn btn-ghost btn-sm" (click)="abrirEditar(a)">Editar</button>
                          <button class="btn btn-danger btn-sm" (click)="confirmarBaja(a)">Baja</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    @if (modal() === 'crear' || modal() === 'editar') {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:680px">
          <div class="modal-header">
            <span class="modal-title">{{ modal()==='crear' ? 'Nuevo artículo' : 'Editar · ' + formulario['nombre'] }}</span>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Referencia *</label><input class="sf-input" [(ngModel)]="formulario['referencia']" /></div>
              <div class="form-group"><label class="form-label">Código de barras</label><input class="sf-input" [(ngModel)]="formulario['cod_barras']" placeholder="EAN-13" /></div>
              <div class="form-group span-2"><label class="form-label">Nombre del artículo *</label><input class="sf-input" [(ngModel)]="formulario['nombre']" /></div>
              <div class="form-group span-2"><label class="form-label">Descripción</label><input class="sf-input" [(ngModel)]="formulario['descripcion']" /></div>
              <div class="form-group"><label class="form-label">Familia</label>
                <select class="sf-input" [(ngModel)]="formulario['familia_id']">
                  <option [value]="null">Sin asignar</option>
                  @for (f of familias(); track f.id) { <option [value]="f.id">{{ f.nombre }}</option> }
                </select>
              </div>
              <div class="form-group"><label class="form-label">Proveedor</label>
                <select class="sf-input" [(ngModel)]="formulario['proveedor_id']">
                  <option [value]="null">Sin asignar</option>
                  @for (p of proveedores(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
                </select>
              </div>
              <div class="form-group"><label class="form-label">Unidad de medida</label><input class="sf-input" [(ngModel)]="formulario['unidad']" placeholder="ud, cj, ml, kg..." /></div>
              <div class="form-group"><label class="form-label">Almacén principal</label>
                <select class="sf-input" [(ngModel)]="formulario['almacen_id']">
                  <option [value]="null">Sin asignar</option>
                  @for (a of almacenes(); track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
                </select>
              </div>
              <div class="form-group"><label class="form-label">Ubicación / Estantería</label><input class="sf-input" [(ngModel)]="formulario['ubicacion']" placeholder="A-01-3" /></div>
              <div class="form-group"><label class="form-label">Stock inicial</label><input class="sf-input" type="number" [(ngModel)]="formulario['stock']" /></div>
              <div class="form-group"><label class="form-label">Stock mínimo</label><input class="sf-input" type="number" [(ngModel)]="formulario['stock_minimo']" /></div>
              <div class="form-group"><label class="form-label">Stock máximo</label><input class="sf-input" type="number" [(ngModel)]="formulario['stock_maximo']" /></div>
              <div class="form-group"><label class="form-label">Punto de reorden</label><input class="sf-input" type="number" [(ngModel)]="formulario['punto_reorden']" /></div>
              <div class="form-group"><label class="form-label">Cant. de reorden</label><input class="sf-input" type="number" [(ngModel)]="formulario['cant_reorden']" /></div>
              <div class="form-group"><label class="form-label">Precio de coste (€)</label><input class="sf-input" type="number" step="0.01" [(ngModel)]="formulario['precio_coste']" /></div>
              <div class="form-group"><label class="form-label">Precio de venta (€)</label><input class="sf-input" type="number" step="0.01" [(ngModel)]="formulario['precio_venta']" /></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="modal.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="guardar()" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar cambios' }}</button>
          </div>
        </div>
      </div>
    }

    @if (modal() === 'movimiento') {
      <div class="modal-overlay" (click)="cerrarOverlay($event)">
        <div class="modal" style="max-width:400px">
          <div class="modal-header">
            <span class="modal-title">Registrar movimiento</span>
            <button class="btn btn-ghost btn-icon" (click)="modal.set(null)">&#10005;</button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
            <div style="background:var(--ink3);border-radius:8px;padding:12px;font-size:13px">
              <strong>{{ artMovimiento()?.nombre }}</strong><br>
              <span class="text-muted">Stock actual: </span>
              <strong style="color:var(--jade)">{{ artMovimiento()?.stock }} {{ artMovimiento()?.unidad }}</strong>
              &nbsp;·&nbsp; <span class="text-muted">Mín.:</span> <strong>{{ artMovimiento()?.stock_minimo }}</strong>
            </div>
            <div class="form-group"><label class="form-label">Tipo de movimiento</label>
              <select class="sf-input" [(ngModel)]="formMovimiento.tipo">
                <option value="entrada">Entrada de mercancía</option>
                <option value="salida">Salida de mercancía</option>
                <option value="ajuste">Ajuste de inventario</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Cantidad ({{ artMovimiento()?.unidad }})</label>
              <input class="sf-input" type="number" min="0.01" step="0.01" [(ngModel)]="formMovimiento.cantidad" />
            </div>
            <div class="form-group"><label class="form-label">Motivo</label>
              <input class="sf-input" [(ngModel)]="formMovimiento.motivo" placeholder="Venta, reposición, ajuste inventario..." />
            </div>
            <div class="form-group"><label class="form-label">Referencia documental</label>
              <input class="sf-input" [(ngModel)]="formMovimiento.referencia" placeholder="ALB-2025-XXX" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="modal.set(null)">Cancelar</button>
            <button class="btn btn-jade" (click)="guardarMovimiento()" [disabled]="guardando()">{{ guardando() ? '...' : 'Registrar' }}</button>
          </div>
        </div>
      </div>
    }

    @if (artBaja()) {
      <div class="modal-overlay" (click)="artBaja.set(null)">
        <div class="modal" style="max-width:400px">
          <div class="modal-header"><span class="modal-title">Dar de baja artículo</span></div>
          <div class="modal-body">
            <p style="color:var(--chalk2);line-height:1.7">
              ¿Dar de baja <strong>{{ artBaja()?.nombre }}</strong>? El historial de movimientos se conservará.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="artBaja.set(null)">Cancelar</button>
            <button class="btn btn-danger" (click)="ejecutarBaja()">Dar de baja</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ProductsComponent implements OnInit {
  articulos      = signal<any[]>([]);
  familias       = signal<any[]>([]);
  proveedores    = signal<any[]>([]);
  almacenes      = signal<any[]>([]);
  cargando       = signal(true);
  guardando      = signal(false);
  modal          = signal<string|null>(null);
  artMovimiento  = signal<any>(null);
  artBaja        = signal<any>(null);
  editandoId: number|null = null;
  pagina         = signal(1);
  pageSize       = 20;
  totalArticulos = signal(0);
  filtros: any = { q:'', familia:'', proveedor:'', almacen:'', estado_stock:'' };
  formulario: any = {};
  formMovimiento = { tipo:'entrada', cantidad:1, motivo:'', referencia:'' };

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.cargar();
    this.api.listarFamilias().subscribe(f => this.familias.set(f));
    this.api.listarProveedores().subscribe(p => this.proveedores.set(p));
    this.api.listarAlmacenes().subscribe(a => this.almacenes.set(a));
  }

  cargar() {
    this.cargando.set(true);
    const query = { ...this.filtros, page: this.pagina(), pageSize: this.pageSize };
    this.api.listarArticulos(query).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.articulos.set(res);
          this.totalArticulos.set(res.length);
        } else {
          this.articulos.set(res.items || []);
          this.totalArticulos.set(res.total || 0);
        }
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  resetearYcargar() {
    this.pagina.set(1);
    this.cargar();
  }

  totalPaginas() {
    return Math.max(1, Math.ceil(this.totalArticulos() / this.pageSize));
  }

  irPagina(n: number) {
    const total = this.totalPaginas();
    if (n < 1 || n > total) return;
    this.pagina.set(n);
    this.cargar();
  }

  abrirCrear() {
    this.formulario = { referencia:'', cod_barras:'', nombre:'', descripcion:'', unidad:'ud',
      stock:0, stock_minimo:0, stock_maximo:null, punto_reorden:null, cant_reorden:null,
      precio_coste:0, precio_venta:0, familia_id:null, proveedor_id:null, almacen_id:null, ubicacion:'' };
    this.editandoId = null;
    this.modal.set('crear');
  }

  abrirEditar(a: any) { this.formulario = { ...a }; this.editandoId = a.id; this.modal.set('editar'); }
  abrirMovimiento(a: any) {
    this.artMovimiento.set(a);
    this.formMovimiento = { tipo:'entrada', cantidad:1, motivo:'', referencia:'' };
    this.modal.set('movimiento');
  }
  confirmarBaja(a: any) { this.artBaja.set(a); }

  guardar() {
    if (!this.formulario['referencia'] || !this.formulario['nombre']) return;
    this.guardando.set(true);
    const req = this.editandoId
      ? this.api.actualizarArticulo(this.editandoId, this.formulario)
      : this.api.crearArticulo(this.formulario);
    req.subscribe({
      next: () => { this.modal.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error al guardar'); this.guardando.set(false); }
    });
  }

  guardarMovimiento() {
    const a = this.artMovimiento();
    if (!a) return;
    this.guardando.set(true);
    this.api.registrarMovimiento({ articulo_id: a.id, ...this.formMovimiento }).subscribe({
      next: () => { this.modal.set(null); this.guardando.set(false); this.cargar(); },
      error: (e: any) => { alert(e.error?.mensaje ?? 'Error'); this.guardando.set(false); }
    });
  }

  ejecutarBaja() {
    const a = this.artBaja();
    if (!a) return;
    this.api.eliminarArticulo(a.id).subscribe(() => { this.artBaja.set(null); this.cargar(); });
  }

  claseStock(a: any) { return a.stock === 0 ? 'out' : a.stock <= a.stock_minimo ? 'low' : 'ok'; }
  colorStock(a: any) { return a.stock === 0 ? 'var(--coral)' : a.stock <= a.stock_minimo ? 'var(--amber)' : 'var(--jade)'; }
  pctStock(a: any) {
    if (!a.stock_maximo) return a.stock > 0 ? 55 : 0;
    return Math.min(100, (a.stock / a.stock_maximo) * 100);
  }
  cerrarOverlay(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.modal.set(null);
  }
}

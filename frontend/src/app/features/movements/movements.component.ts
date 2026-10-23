import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ApiService }                from '../../core/services/api.service';

@Component({
  selector: 'sf-movements', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div class="topbar">
      <span class="topbar-title">Historial de movimientos</span>
      <span class="text-sm text-muted">{{ movimientos().length }} registros</span>
    </div>
    <div class="page section-gap">
      <div class="toolbar">
        <select class="sf-input" style="width:auto" [(ngModel)]="f.tipo" (ngModelChange)="cargar()">
          <option value="">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
          <option value="ajuste">Ajustes</option>
        </select>
        <div class="flex gap-8">
          <label class="form-label" style="white-space:nowrap">Desde</label>
          <input class="sf-input" type="date" [(ngModel)]="f.desde" (ngModelChange)="cargar()" style="width:auto" />
        </div>
        <div class="flex gap-8">
          <label class="form-label" style="white-space:nowrap">Hasta</label>
          <input class="sf-input" type="date" [(ngModel)]="f.hasta" (ngModelChange)="cargar()" style="width:auto" />
        </div>
        <button class="btn btn-ghost" (click)="f={tipo:'',desde:'',hasta:''};cargar()">Limpiar filtros</button>
      </div>

      <div style="display:flex;gap:10px">
        @for (res of resumen(); track res.etiqueta) {
          <div class="kpi" style="flex:1;padding:12px 16px">
            <div class="kpi-label">{{ res.etiqueta }}</div>
            <div class="kpi-value" style="font-size:22px">{{ res.cantidad }}</div>
          </div>
        }
      </div>

      <div class="card" style="padding:0">
        @if (cargando()) { <div class="spinner-wrap"><div class="spinner"></div></div> }
        @else if (!movimientos().length) { <div class="empty-box"><div>Sin movimientos para el filtro seleccionado</div></div> }
        @else {
          <div class="tbl-wrap">
            <table class="sf-tbl">
              <thead>
                <tr>
                  <th>Artículo</th><th>Tipo</th><th>Cantidad</th>
                  <th>Stock anterior</th><th>Stock posterior</th>
                  <th>Motivo</th><th>Referencia</th><th>Almacén</th><th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                @for (m of movimientos(); track m.id) {
                  <tr>
                    <td>
                      <div style="font-weight:500">{{ m.nombre_articulo }}</div>
                      <div class="mono text-muted" style="font-size:10px">{{ m.referencia }}</div>
                    </td>
                    <td>
                      <span [class]="'badge badge-' + m.tipo">
                        {{ m.tipo==='entrada' ? 'Entrada' : m.tipo==='salida' ? 'Salida' : 'Ajuste' }}
                      </span>
                    </td>
                    <td class="mono fw-600">{{ m.cantidad }} {{ m.unidad }}</td>
                    <td class="mono text-muted">{{ m.stock_antes }}</td>
                    <td class="mono" [style.color]="m.stock_despues > m.stock_antes ? 'var(--jade)' : m.stock_despues < m.stock_antes ? 'var(--coral)' : 'inherit'">{{ m.stock_despues }}</td>
                    <td class="text-sm">{{ m.motivo ?? '—' }}</td>
                    <td class="mono text-sm text-muted">{{ m.referencia ?? '—' }}</td>
                    <td class="text-sm text-muted">{{ m.nombre_almacen ?? '—' }}</td>
                    <td class="text-sm text-muted" style="white-space:nowrap">{{ m.fecha | date:'dd/MM/yy HH:mm' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class MovementsComponent implements OnInit {
  movimientos = signal<any[]>([]);
  cargando    = signal(true);
  resumen     = signal<any[]>([]);
  f           = { tipo:'', desde:'', hasta:'' };

  constructor(private api: ApiService) {}
  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.api.listarMovimientos({ tipo: this.f.tipo, desde: this.f.desde, hasta: this.f.hasta }).subscribe({
      next: m => {
        this.movimientos.set(m);
        this.cargando.set(false);
        this.resumen.set([
          { etiqueta: 'Entradas', cantidad: m.filter((x: any) => x.tipo === 'entrada').length },
          { etiqueta: 'Salidas',  cantidad: m.filter((x: any) => x.tipo === 'salida').length },
          { etiqueta: 'Ajustes',  cantidad: m.filter((x: any) => x.tipo === 'ajuste').length },
        ]);
      },
      error: () => this.cargando.set(false)
    });
  }
}

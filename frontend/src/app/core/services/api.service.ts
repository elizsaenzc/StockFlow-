import { Injectable }                from '@angular/core';
import { HttpClient, HttpParams }    from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private params(filtros: Record<string, any> = {}) {
    let p = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return p;
  }

  obtenerPanel()      { return this.http.get<any>('/api/panel'); }
  obtenerAnaliticas() { return this.http.get<any>('/api/analiticas'); }

  listarArticulos(f?: any)               { return this.http.get<any[]>('/api/articulos', { params: this.params(f) }); }
  obtenerArticulo(id: number)            { return this.http.get<any>(`/api/articulos/${id}`); }
  crearArticulo(b: any)                  { return this.http.post<any>('/api/articulos', b); }
  actualizarArticulo(id: number, b: any) { return this.http.put<any>(`/api/articulos/${id}`, b); }
  eliminarArticulo(id: number)           { return this.http.delete<void>(`/api/articulos/${id}`); }

  listarFamilias()                       { return this.http.get<any[]>('/api/familias'); }
  crearFamilia(b: any)                   { return this.http.post<any>('/api/familias', b); }

  listarAlmacenes()                      { return this.http.get<any[]>('/api/almacenes'); }

  listarProveedores()                    { return this.http.get<any[]>('/api/proveedores'); }
  obtenerProveedor(id: number)           { return this.http.get<any>(`/api/proveedores/${id}`); }
  crearProveedor(b: any)                 { return this.http.post<any>('/api/proveedores', b); }
  actualizarProveedor(id: number, b: any){ return this.http.put<any>(`/api/proveedores/${id}`, b); }

  listarMovimientos(f?: any)             { return this.http.get<any[]>('/api/movimientos', { params: this.params(f) }); }
  registrarMovimiento(b: any)            { return this.http.post<any>('/api/movimientos', b); }

  listarPedidos(f?: any)                 { return this.http.get<any[]>('/api/pedidos', { params: this.params(f) }); }
  crearPedido(b: any)                    { return this.http.post<any>('/api/pedidos', b); }
  recibirPedido(id: number, b: any)      { return this.http.patch<any>(`/api/pedidos/${id}/recibir`, b); }
  cancelarPedido(id: number)             { return this.http.patch<any>(`/api/pedidos/${id}/cancelar`, {}); }
}

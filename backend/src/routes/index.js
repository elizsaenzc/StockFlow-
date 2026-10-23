import { Router }                          from 'express';
import { verificarToken, requerirRol }     from '../middleware/auth.js';
import {
  iniciarSesion,
  obtenerPanel,
  listarArticulos, obtenerArticulo, crearArticulo, actualizarArticulo, eliminarArticulo,
  listarFamilias, crearFamilia,
  listarAlmacenes, crearAlmacen,
  listarProveedores, obtenerProveedor, crearProveedor, actualizarProveedor,
  listarMovimientos, registrarMovimiento,
  listarPedidos, crearPedido, recibirPedido, cancelarPedido,
  obtenerAnaliticas
} from '../controllers/index.js';

const r = Router();

r.post('/sesion', iniciarSesion);

r.use(verificarToken);

r.get('/panel', obtenerPanel);
r.get('/analiticas', obtenerAnaliticas);

r.get('/articulos',        listarArticulos);
r.get('/articulos/:id',    obtenerArticulo);
r.post('/articulos',       crearArticulo);
r.put('/articulos/:id',    actualizarArticulo);
r.delete('/articulos/:id', requerirRol('administrador','responsable'), eliminarArticulo);

r.get('/familias',  listarFamilias);
r.post('/familias', requerirRol('administrador','responsable'), crearFamilia);

r.get('/almacenes',  listarAlmacenes);
r.post('/almacenes', requerirRol('administrador'), crearAlmacen);

r.get('/proveedores',      listarProveedores);
r.get('/proveedores/:id',  obtenerProveedor);
r.post('/proveedores',     requerirRol('administrador','responsable'), crearProveedor);
r.put('/proveedores/:id',  requerirRol('administrador','responsable'), actualizarProveedor);

r.get('/movimientos',  listarMovimientos);
r.post('/movimientos', registrarMovimiento);

r.get('/pedidos',                listarPedidos);
r.post('/pedidos',               requerirRol('administrador','responsable'), crearPedido);
r.patch('/pedidos/:id/recibir',  recibirPedido);
r.patch('/pedidos/:id/cancelar', requerirRol('administrador','responsable'), cancelarPedido);

export default r;

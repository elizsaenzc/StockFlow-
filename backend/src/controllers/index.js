import { run, all, first, guardarBD } from '../db/database.js';
import { generarToken }               from '../middleware/auth.js';
import bcrypt                          from 'bcryptjs';

// SQLite guarda las fechas en UTC sin zona ('2026-10-23 18:05:56'): se devuelven en ISO con 'Z'
// para que el navegador las muestre en hora local.
const iso = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? v.replace(' ', 'T') + 'Z' : v);
const conFechas = fila => fila && Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, k.startsWith('fecha') || k === 'ultimo_movimiento' ? iso(v) : v]));
const filas = lista => lista.map(conFechas);
const num = v => (v === '' || v === null || v === undefined ? NaN : Number(v));

// ── Autenticación ─────────────────────────────────────────────────────────────
export function iniciarSesion(req, res) {
  const { nombre_usuario, contrasena } = req.body;
  if (!nombre_usuario || !contrasena)
    return res.status(400).json({ mensaje: 'Usuario y contraseña requeridos' });
  const u = first('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario]);
  if (!u || !bcrypt.compareSync(contrasena, u.contrasena))
    return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
  res.json({
    token: generarToken(u),
    usuario: { id: u.id, nombre_usuario: u.nombre_usuario, rol: u.rol, nombre: u.nombre_completo }
  });
}

// ── Panel de control ──────────────────────────────────────────────────────────
export function obtenerPanel(req, res) {
  const kpis = {
    totalArticulos:     first("SELECT COUNT(*) as n FROM articulos WHERE activo=1")?.n ?? 0,
    stockBajo:          first("SELECT COUNT(*) as n FROM articulos WHERE activo=1 AND stock <= stock_minimo AND stock > 0")?.n ?? 0,
    sinStock:           first("SELECT COUNT(*) as n FROM articulos WHERE activo=1 AND stock = 0")?.n ?? 0,
    totalProveedores:   first("SELECT COUNT(*) as n FROM proveedores WHERE activo=1")?.n ?? 0,
    pedidosAbiertos:    first("SELECT COUNT(*) as n FROM pedidos_compra WHERE estado NOT IN ('recibido','cancelado')")?.n ?? 0,
    valorCoste:         first("SELECT COALESCE(SUM(stock*precio_coste),0) as v FROM articulos WHERE activo=1")?.v ?? 0,
    valorVenta:         first("SELECT COALESCE(SUM(stock*precio_venta),0) as v FROM articulos WHERE activo=1")?.v ?? 0,
    movimientosHoy:     first("SELECT COUNT(*) as n FROM movimientos WHERE date(fecha) = date('now')")?.n ?? 0,
  };

  const movimientosRecientes = all(`
    SELECT m.id, m.tipo, m.cantidad, m.stock_antes, m.stock_despues, m.motivo, m.fecha,
           a.nombre AS nombre_articulo, a.referencia, a.unidad,
           al.nombre AS nombre_almacen, u.nombre_completo AS nombre_usuario
    FROM movimientos m
    JOIN articulos a ON a.id = m.articulo_id
    LEFT JOIN almacenes al ON al.id = m.almacen_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.fecha DESC LIMIT 15`);

  const articulosCriticos = all(`
    SELECT a.*, f.nombre AS nombre_familia, f.color AS color_familia,
           p.nombre AS nombre_proveedor, al.nombre AS nombre_almacen
    FROM articulos a
    LEFT JOIN familias f ON f.id = a.familia_id
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    LEFT JOIN almacenes al ON al.id = a.almacen_id
    WHERE a.activo=1 AND a.stock <= a.stock_minimo
    ORDER BY (CAST(a.stock AS REAL) / MAX(a.stock_minimo, 1)) ASC LIMIT 10`);

  const porFamilia = all(`
    SELECT f.nombre, f.color,
           COUNT(a.id) AS total_articulos,
           COALESCE(SUM(a.stock*a.precio_coste),0) AS valor_stock
    FROM familias f LEFT JOIN articulos a ON a.familia_id=f.id AND a.activo=1
    GROUP BY f.id ORDER BY valor_stock DESC`);

  const graficaMovimientos = all(`
    SELECT date(fecha) AS dia,
           SUM(CASE WHEN tipo='entrada' THEN cantidad ELSE 0 END) AS entradas,
           SUM(CASE WHEN tipo='salida'  THEN cantidad ELSE 0 END) AS salidas
    FROM movimientos WHERE fecha >= datetime('now','-30 days')
    GROUP BY dia ORDER BY dia`);

  const masMovidos = all(`
    SELECT a.id, a.nombre, a.referencia, a.unidad,
           COUNT(m.id) AS num_movimientos, SUM(m.cantidad) AS cantidad_total
    FROM movimientos m JOIN articulos a ON a.id=m.articulo_id
    WHERE m.fecha >= datetime('now','-30 days')
    GROUP BY a.id ORDER BY num_movimientos DESC LIMIT 5`);

  const pedidosPendientes = all(`
    SELECT pc.id, pc.numero_pedido, pc.estado, pc.importe_total, pc.fecha_esperada, p.nombre AS nombre_proveedor
    FROM pedidos_compra pc JOIN proveedores p ON p.id=pc.proveedor_id
    WHERE pc.estado IN ('enviado','parcial') ORDER BY pc.fecha_esperada ASC LIMIT 5`);

  res.json({ kpis, movimientosRecientes: filas(movimientosRecientes), articulosCriticos, porFamilia, graficaMovimientos, masMovidos, pedidosPendientes });
}

// ── Artículos ─────────────────────────────────────────────────────────────────
const SQL_ART = `
  SELECT a.*, f.nombre AS nombre_familia, f.color AS color_familia,
         p.nombre AS nombre_proveedor, al.nombre AS nombre_almacen,
         CASE WHEN a.stock=0 THEN 'sin_stock'
              WHEN a.stock<=a.stock_minimo THEN 'bajo'
              ELSE 'correcto' END AS estado_stock
  FROM articulos a
  LEFT JOIN familias f ON f.id=a.familia_id
  LEFT JOIN proveedores p ON p.id=a.proveedor_id
  LEFT JOIN almacenes al ON al.id=a.almacen_id`;

export function listarArticulos(req, res) {
  const { q, familia, proveedor, almacen, estado_stock, activo = '1', page, pageSize } = req.query;
  let where = ' WHERE a.activo=?';
  const args = [Number(activo === 'todos' ? 1 : activo)];
  if (q) {
    where += ' AND (a.nombre LIKE ? OR a.referencia LIKE ? OR a.cod_barras LIKE ?)';
    const like = `%${q}%`; args.push(like, like, like);
  }
  if (familia)      { where += ' AND a.familia_id=?';   args.push(Number(familia)); }
  if (proveedor)    { where += ' AND a.proveedor_id=?'; args.push(Number(proveedor)); }
  if (almacen)      { where += ' AND a.almacen_id=?';   args.push(Number(almacen)); }
  if (estado_stock === 'bajo')       where += ' AND a.stock>0 AND a.stock<=a.stock_minimo';
  if (estado_stock === 'sin_stock')  where += ' AND a.stock=0';
  if (estado_stock === 'correcto')   where += ' AND a.stock>a.stock_minimo';
  const sql = SQL_ART + where;

  const pageNum = page !== undefined ? Math.max(1, Number(page) || 1) : null;
  const pageSizeNum = pageSize !== undefined ? Math.max(1, Number(pageSize) || 20) : null;

  if (pageNum !== null || pageSizeNum !== null) {
    const pageValue = pageNum ?? 1;
    const limit = pageSizeNum ?? 20;
    const total = first(`SELECT COUNT(*) as total FROM articulos a${where}`, args)?.total ?? 0;
    const items = all(sql + ' ORDER BY a.nombre LIMIT ? OFFSET ?', [...args, limit, (pageValue - 1) * limit]);
    return res.json({ items, total, page: pageValue, pageSize: limit });
  }

  res.json(all(sql + ' ORDER BY a.nombre', args));
}

export function obtenerArticulo(req, res) {
  const a = first(SQL_ART + ' WHERE a.id=?', [Number(req.params.id)]);
  if (!a) return res.status(404).json({ mensaje: 'Artículo no encontrado' });
  const movimientos = all(`
    SELECT m.*, al.nombre AS nombre_almacen, u.nombre_completo AS nombre_usuario
    FROM movimientos m LEFT JOIN almacenes al ON al.id=m.almacen_id
    LEFT JOIN usuarios u ON u.id=m.usuario_id
    WHERE m.articulo_id=? ORDER BY m.fecha DESC LIMIT 12`, [a.id]);
  res.json({ ...a, movimientos: filas(movimientos) });
}

export function crearArticulo(req, res) {
  const { referencia, cod_barras, nombre, descripcion, familia_id, proveedor_id,
          unidad, stock=0, stock_minimo=0, stock_maximo, punto_reorden, cant_reorden,
          precio_coste=0, precio_venta=0, almacen_id, ubicacion } = req.body;
  if (!referencia?.trim() || !nombre?.trim())
    return res.status(400).json({ mensaje: 'Referencia y nombre son obligatorios' });
  if ([stock, stock_minimo, precio_coste, precio_venta].some(v => !(num(v) >= 0)))
    return res.status(400).json({ mensaje: 'Stock y precios deben ser números positivos' });
  if (first('SELECT id FROM articulos WHERE referencia=?', [referencia.trim()]))
    return res.status(409).json({ mensaje: `Ya existe un artículo con la referencia ${referencia}` });
  const r = run(`INSERT INTO articulos
    (referencia,cod_barras,nombre,descripcion,familia_id,proveedor_id,unidad,
     stock,stock_minimo,stock_maximo,punto_reorden,cant_reorden,
     precio_coste,precio_venta,almacen_id,ubicacion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [referencia.trim(), cod_barras||null, nombre.trim(), descripcion||null,
     familia_id||null, proveedor_id||null, unidad||'ud',
     num(stock), num(stock_minimo), stock_maximo||null, punto_reorden||null, cant_reorden||null,
     num(precio_coste), num(precio_venta), almacen_id||null, ubicacion||null]);
  if (num(stock) > 0)
    run(`INSERT INTO movimientos (articulo_id,almacen_id,tipo,cantidad,stock_antes,stock_despues,motivo,usuario_id)
         VALUES (?,?,'entrada',?,0,?,'Alta de artículo nuevo',?)`,
        [r.ultimoId, almacen_id||null, stock, stock, req.usuario.id]);
  guardarBD();
  res.status(201).json(first(SQL_ART + ' WHERE a.id=?', [r.ultimoId]));
}

export function actualizarArticulo(req, res) {
  const id = Number(req.params.id);
  const cur = first('SELECT * FROM articulos WHERE id=?', [id]);
  if (!cur) return res.status(404).json({ mensaje: 'Artículo no encontrado' });
  const { referencia,cod_barras,nombre,descripcion,familia_id,proveedor_id,unidad,
          stock_minimo,stock_maximo,punto_reorden,cant_reorden,
          precio_coste,precio_venta,almacen_id,ubicacion,activo } = req.body;
  run(`UPDATE articulos SET referencia=?,cod_barras=?,nombre=?,descripcion=?,familia_id=?,proveedor_id=?,
       unidad=?,stock_minimo=?,stock_maximo=?,punto_reorden=?,cant_reorden=?,precio_coste=?,precio_venta=?,
       almacen_id=?,ubicacion=?,activo=?,fecha_mod=datetime('now') WHERE id=?`,
    [referencia??cur.referencia, cod_barras??cur.cod_barras, nombre??cur.nombre,
     descripcion??cur.descripcion, familia_id??cur.familia_id, proveedor_id??cur.proveedor_id,
     unidad??cur.unidad, stock_minimo??cur.stock_minimo, stock_maximo??cur.stock_maximo,
     punto_reorden??cur.punto_reorden, cant_reorden??cur.cant_reorden,
     precio_coste??cur.precio_coste, precio_venta??cur.precio_venta,
     almacen_id??cur.almacen_id, ubicacion??cur.ubicacion,
     activo!==undefined ? Number(activo) : cur.activo, id]);
  guardarBD();
  res.json(first(SQL_ART + ' WHERE a.id=?', [id]));
}

export function eliminarArticulo(req, res) {
  const id = Number(req.params.id);
  if (!first('SELECT id FROM articulos WHERE id=?', [id]))
    return res.status(404).json({ mensaje: 'Artículo no encontrado' });
  run("UPDATE articulos SET activo=0,fecha_mod=datetime('now') WHERE id=?", [id]);
  guardarBD();
  res.status(204).end();
}

// ── Familias ──────────────────────────────────────────────────────────────────
export function listarFamilias(_req, res) {
  res.json(all('SELECT * FROM familias ORDER BY nombre'));
}
export function crearFamilia(req, res) {
  const { nombre, color } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'Nombre requerido' });
  const r = run('INSERT OR IGNORE INTO familias (nombre, color) VALUES (?,?)', [nombre, color||'#6C7FFF']);
  guardarBD();
  res.status(201).json(first('SELECT * FROM familias WHERE id=?', [r.ultimoId]));
}

// ── Almacenes ─────────────────────────────────────────────────────────────────
export function listarAlmacenes(_req, res) {
  const almacenes = all('SELECT * FROM almacenes WHERE activo=1 ORDER BY nombre');
  const result = almacenes.map(a => {
    const stats = first('SELECT COUNT(*) AS total_articulos, COALESCE(SUM(stock*precio_coste),0) AS valor_stock FROM articulos WHERE almacen_id=? AND activo=1', [a.id]);
    return { ...a, ...stats };
  });
  res.json(result);
}
export function crearAlmacen(req, res) {
  const { nombre, direccion, ciudad, responsable } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'Nombre requerido' });
  const r = run('INSERT INTO almacenes (nombre, direccion, ciudad, responsable) VALUES (?,?,?,?)',
                [nombre, direccion||null, ciudad||null, responsable||null]);
  guardarBD();
  res.status(201).json(first('SELECT * FROM almacenes WHERE id=?', [r.ultimoId]));
}

// ── Proveedores ───────────────────────────────────────────────────────────────
export function listarProveedores(_req, res) {
  const rows = all('SELECT * FROM proveedores WHERE activo=1 ORDER BY nombre');
  const result = rows.map(p => {
    const total_articulos  = first('SELECT COUNT(*) AS n FROM articulos WHERE proveedor_id=? AND activo=1', [p.id])?.n ?? 0;
    const pedidos_abiertos = first(`SELECT COUNT(*) AS n FROM pedidos_compra
      WHERE proveedor_id=? AND estado NOT IN ('recibido','cancelado')`, [p.id])?.n ?? 0;
    return { ...p, total_articulos, pedidos_abiertos };
  });
  res.json(result);
}
export function obtenerProveedor(req, res) {
  const p = first('SELECT * FROM proveedores WHERE id=?', [Number(req.params.id)]);
  if (!p) return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
  const articulos = all('SELECT id,referencia,nombre,stock,precio_coste FROM articulos WHERE proveedor_id=? AND activo=1', [p.id]);
  const pedidos   = all(`SELECT pc.*,al.nombre AS nombre_almacen FROM pedidos_compra pc
    LEFT JOIN almacenes al ON al.id=pc.almacen_id WHERE pc.proveedor_id=? ORDER BY pc.fecha_alta DESC LIMIT 10`, [p.id]);
  res.json({ ...p, articulos, pedidos: filas(pedidos) });
}
export function crearProveedor(req, res) {
  const { nombre,contacto,correo,telefono,direccion,pais,plazo_entrega,condiciones_pago,notas } = req.body;
  const { puntuacion } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });
  const r = run('INSERT INTO proveedores (nombre,contacto,correo,telefono,direccion,pais,plazo_entrega,condiciones_pago,notas,puntuacion) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [nombre.trim(), contacto||null, correo||null, telefono||null, direccion||null, pais||'España', num(plazo_entrega) || 7, condiciones_pago||null, notas||null,
     Math.min(10, Math.max(0, num(puntuacion) || 7))]);
  guardarBD();
  res.status(201).json(first('SELECT * FROM proveedores WHERE id=?', [r.ultimoId]));
}
export function actualizarProveedor(req, res) {
  const id = Number(req.params.id);
  const cur = first('SELECT * FROM proveedores WHERE id=?', [id]);
  if (!cur) return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
  const { nombre,contacto,correo,telefono,direccion,pais,plazo_entrega,condiciones_pago,notas,puntuacion,activo } = req.body;
  run('UPDATE proveedores SET nombre=?,contacto=?,correo=?,telefono=?,direccion=?,pais=?,plazo_entrega=?,condiciones_pago=?,notas=?,puntuacion=?,activo=? WHERE id=?',
    [nombre??cur.nombre, contacto??cur.contacto, correo??cur.correo, telefono??cur.telefono,
     direccion??cur.direccion, pais??cur.pais, plazo_entrega??cur.plazo_entrega,
     condiciones_pago??cur.condiciones_pago, notas??cur.notas, puntuacion??cur.puntuacion,
     activo!==undefined ? Number(activo) : cur.activo, id]);
  guardarBD();
  res.json(first('SELECT * FROM proveedores WHERE id=?', [id]));
}

// ── Movimientos ───────────────────────────────────────────────────────────────
export function listarMovimientos(req, res) {
  const { articulo_id, tipo, almacen_id, desde, hasta, limite=150 } = req.query;
  let sql = `SELECT m.*, a.nombre AS nombre_articulo, a.referencia, m.referencia AS documento, a.unidad,
    al.nombre AS nombre_almacen, u.nombre_completo AS nombre_usuario
    FROM movimientos m JOIN articulos a ON a.id=m.articulo_id
    LEFT JOIN almacenes al ON al.id=m.almacen_id LEFT JOIN usuarios u ON u.id=m.usuario_id
    WHERE 1=1`;
  const args = [];
  if (articulo_id) { sql += ' AND m.articulo_id=?'; args.push(Number(articulo_id)); }
  if (tipo)        { sql += ' AND m.tipo=?';         args.push(tipo); }
  if (almacen_id)  { sql += ' AND m.almacen_id=?';  args.push(Number(almacen_id)); }
  if (desde)       { sql += ' AND m.fecha>=?';       args.push(desde); }
  if (hasta)       { sql += ' AND m.fecha<=?';       args.push(hasta + ' 23:59:59'); }
  sql += ' ORDER BY m.fecha DESC LIMIT ?'; args.push(Number(limite));
  res.json(filas(all(sql, args)));
}

export function registrarMovimiento(req, res) {
  const { articulo_id, tipo, motivo, referencia, almacen_id } = req.body;
  const cantidad = num(req.body.cantidad);
  if (!articulo_id || !tipo || Number.isNaN(cantidad))
    return res.status(400).json({ mensaje: 'Artículo, tipo y cantidad son obligatorios' });
  if (!['entrada','salida','ajuste'].includes(tipo))
    return res.status(400).json({ mensaje: 'El tipo debe ser entrada, salida o ajuste' });
  if (tipo === 'ajuste' ? cantidad < 0 : cantidad <= 0)
    return res.status(400).json({ mensaje: 'La cantidad debe ser mayor que cero' });

  const art = first('SELECT * FROM articulos WHERE id=? AND activo=1', [Number(articulo_id)]);
  if (!art) return res.status(404).json({ mensaje: 'Artículo no encontrado' });

  const antes = parseFloat(art.stock) || 0;
  let despues;
  if (tipo === 'entrada')    despues = antes + cantidad;
  else if (tipo === 'salida') {
    if (cantidad > antes)
      return res.status(422).json({ mensaje: `Stock insuficiente (disponible: ${antes} ${art.unidad})` });
    despues = antes - cantidad;
  } else despues = cantidad;   // ajuste: la cantidad es el recuento físico
  if (tipo === 'ajuste' && despues === antes)
    return res.status(400).json({ mensaje: 'El recuento coincide con el stock actual' });

  const r = run(`INSERT INTO movimientos (articulo_id,almacen_id,tipo,cantidad,stock_antes,stock_despues,motivo,referencia,usuario_id)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [articulo_id, almacen_id||art.almacen_id, tipo, tipo === 'ajuste' ? Math.abs(despues - antes) : cantidad, antes, despues,
     motivo||null, referencia||null, req.usuario.id]);
  run("UPDATE articulos SET stock=?,fecha_mod=datetime('now') WHERE id=?", [despues, articulo_id]);
  guardarBD();

  const mov = first(`SELECT m.*,a.nombre AS nombre_articulo,a.referencia,m.referencia AS documento,a.unidad,
    al.nombre AS nombre_almacen,u.nombre_completo AS nombre_usuario
    FROM movimientos m JOIN articulos a ON a.id=m.articulo_id
    LEFT JOIN almacenes al ON al.id=m.almacen_id LEFT JOIN usuarios u ON u.id=m.usuario_id
    WHERE m.id=?`, [r.ultimoId]);
  res.status(201).json(conFechas(mov));
}

// ── Pedidos de compra ─────────────────────────────────────────────────────────
const SQL_PC = `SELECT pc.*, p.nombre AS nombre_proveedor, p.plazo_entrega,
  al.nombre AS nombre_almacen, u.nombre_completo AS creado_por_nombre
  FROM pedidos_compra pc JOIN proveedores p ON p.id=pc.proveedor_id
  LEFT JOIN almacenes al ON al.id=pc.almacen_id LEFT JOIN usuarios u ON u.id=pc.creado_por`;

function adjuntarLineas(pedidos) {
  return pedidos.map(pc => {
    const lineas = all(`SELECT lp.*,a.nombre AS nombre_articulo,a.referencia,a.unidad
      FROM lineas_pedido lp JOIN articulos a ON a.id=lp.articulo_id WHERE lp.pedido_id=?`, [pc.id]);
    return { ...pc, lineas };
  });
}

export function listarPedidos(req, res) {
  const { estado, proveedor_id } = req.query;
  let sql = SQL_PC + ' WHERE 1=1'; const args = [];
  if (estado)      { sql += ' AND pc.estado=?';       args.push(estado); }
  if (proveedor_id){ sql += ' AND pc.proveedor_id=?'; args.push(Number(proveedor_id)); }
  sql += ' ORDER BY pc.fecha_alta DESC LIMIT 100';
  res.json(adjuntarLineas(filas(all(sql, args))));
}

export function crearPedido(req, res) {
  const { proveedor_id, almacen_id, fecha_esperada, notas, lineas=[] } = req.body;
  if (!proveedor_id || !first('SELECT id FROM proveedores WHERE id=?', [Number(proveedor_id)]))
    return res.status(400).json({ mensaje: 'Selecciona un proveedor' });
  const validas = lineas
    .map(l => ({ articulo_id: Number(l.articulo_id), cantidad: num(l.cantidad), precio_unitario: num(l.precio_unitario) }))
    .filter(l => l.articulo_id && l.cantidad > 0 && l.precio_unitario >= 0);
  if (!validas.length || validas.length !== lineas.length)
    return res.status(400).json({ mensaje: 'Revisa las líneas: cada una necesita artículo, cantidad y precio' });
  const siguiente = (first('SELECT MAX(id) as n FROM pedidos_compra')?.n ?? 0) + 1;
  const numero = `PC-${new Date().getFullYear()}-${String(siguiente).padStart(3,'0')}`;
  const total  = validas.reduce((s,l) => s + (l.cantidad * l.precio_unitario), 0);
  const r = run(`INSERT INTO pedidos_compra (numero_pedido,proveedor_id,almacen_id,fecha_esperada,importe_total,notas,creado_por)
    VALUES (?,?,?,?,?,?,?)`,
    [numero, proveedor_id, almacen_id||null, fecha_esperada||null, total, notas||null, req.usuario.id]);
  const oid = r.ultimoId;
  validas.forEach(l => {
    const artId = first('SELECT id FROM articulos WHERE id=?', [l.articulo_id])?.id;
    if (artId) run('INSERT INTO lineas_pedido (pedido_id,articulo_id,cantidad_pedida,precio_unitario) VALUES (?,?,?,?)',
      [oid, artId, l.cantidad, l.precio_unitario]);
  });
  guardarBD();
  const pc = first(SQL_PC + ' WHERE pc.id=?', [oid]);
  res.status(201).json({ ...conFechas(pc), lineas: all('SELECT lp.*,a.nombre AS nombre_articulo,a.referencia,a.unidad FROM lineas_pedido lp JOIN articulos a ON a.id=lp.articulo_id WHERE lp.pedido_id=?',[oid]) });
}

export function recibirPedido(req, res) {
  const oid    = Number(req.params.id);
  const pedido = first('SELECT * FROM pedidos_compra WHERE id=?', [oid]);
  if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
  if (['recibido','cancelado'].includes(pedido.estado))
    return res.status(400).json({ mensaje: `Pedido ya en estado: ${pedido.estado}` });

  const { lineas=[] } = req.body;
  lineas.forEach(({ linea_id, cantidad_recibida: pedida }) => {
    const linea = first('SELECT * FROM lineas_pedido WHERE id=? AND pedido_id=?', [linea_id, oid]);
    if (!linea) return;
    // No se puede recibir más de lo pendiente en la línea
    const cantidad_recibida = Math.min(num(pedida), linea.cantidad_pedida - linea.cantidad_recibida);
    if (!(cantidad_recibida > 0)) return;
    const art = first('SELECT * FROM articulos WHERE id=?', [linea.articulo_id]);
    if (!art) return;
    const antes   = parseFloat(art.stock) || 0;
    const despues = antes + cantidad_recibida;
    run("UPDATE articulos SET stock=?,fecha_mod=datetime('now') WHERE id=?", [despues, art.id]);
    run('UPDATE lineas_pedido SET cantidad_recibida=cantidad_recibida+? WHERE id=?', [cantidad_recibida, linea_id]);
    run(`INSERT INTO movimientos (articulo_id,almacen_id,tipo,cantidad,stock_antes,stock_despues,motivo,referencia,pedido_id,usuario_id)
         VALUES (?,?,'entrada',?,?,?,'Recepción de pedido de compra',?,?,?)`,
        [art.id, pedido.almacen_id, cantidad_recibida, antes, despues, pedido.numero_pedido, oid, req.usuario.id]);
  });

  const pendientes = first('SELECT COUNT(*) as n FROM lineas_pedido WHERE pedido_id=? AND cantidad_recibida<cantidad_pedida', [oid])?.n ?? 0;
  run("UPDATE pedidos_compra SET estado=?,fecha_recepcion=datetime('now'),fecha_mod=datetime('now') WHERE id=?",
    [pendientes===0 ? 'recibido' : 'parcial', oid]);
  guardarBD();

  const actualizado = first(SQL_PC + ' WHERE pc.id=?', [oid]);
  res.json({ ...conFechas(actualizado), lineas: all('SELECT lp.*,a.nombre AS nombre_articulo,a.referencia,a.unidad FROM lineas_pedido lp JOIN articulos a ON a.id=lp.articulo_id WHERE lp.pedido_id=?',[oid]) });
}

export function cancelarPedido(req, res) {
  const oid = Number(req.params.id);
  const pc = first('SELECT estado FROM pedidos_compra WHERE id=?', [oid]);
  if (!pc) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
  if (['recibido', 'cancelado'].includes(pc.estado))
    return res.status(400).json({ mensaje: `No se puede cancelar un pedido ${pc.estado}` });
  run("UPDATE pedidos_compra SET estado='cancelado',fecha_mod=datetime('now') WHERE id=?", [oid]);
  guardarBD();
  res.json({ mensaje: 'Pedido cancelado' });
}

// ── Analíticas ────────────────────────────────────────────────────────────────
export function obtenerAnaliticas(_req, res) {
  const rotacion = all(`
    SELECT a.id,a.nombre,a.referencia,a.unidad,a.stock,a.precio_coste,
           COALESCE(SUM(CASE WHEN m.tipo='salida'  THEN m.cantidad ELSE 0 END),0) AS salidas_90d,
           COALESCE(SUM(CASE WHEN m.tipo='entrada' THEN m.cantidad ELSE 0 END),0) AS entradas_90d,
           COUNT(m.id) AS num_movimientos
    FROM articulos a LEFT JOIN movimientos m ON m.articulo_id=a.id AND m.fecha>=datetime('now','-90 days')
    WHERE a.activo=1 GROUP BY a.id ORDER BY num_movimientos DESC LIMIT 20`);

  const valorPorFamilia = all(`
    SELECT f.nombre,f.color,COUNT(a.id) AS articulos,
           COALESCE(SUM(a.stock*a.precio_coste),0) AS valor_coste,
           COALESCE(SUM(a.stock*a.precio_venta),0) AS valor_venta
    FROM familias f LEFT JOIN articulos a ON a.familia_id=f.id AND a.activo=1
    GROUP BY f.id ORDER BY valor_coste DESC`);

  const graficaDiaria = all(`
    SELECT date(fecha) AS dia,
           SUM(CASE WHEN tipo='entrada' THEN cantidad ELSE 0 END) AS entradas,
           SUM(CASE WHEN tipo='salida'  THEN cantidad ELSE 0 END) AS salidas
    FROM movimientos WHERE fecha>=datetime('now','-90 days') GROUP BY dia ORDER BY dia`);

  const rendimientoProveedores = all(`
    SELECT p.id,p.nombre,p.puntuacion,p.plazo_entrega,
           COUNT(pc.id) AS total_pedidos,
           COUNT(CASE WHEN pc.estado='recibido' THEN 1 END) AS completados,
           COALESCE(SUM(pc.importe_total),0) AS gasto_total
    FROM proveedores p LEFT JOIN pedidos_compra pc ON pc.proveedor_id=p.id
    WHERE p.activo=1 GROUP BY p.id ORDER BY gasto_total DESC`);

  const stockInmovilizado = all(`
    SELECT a.id,a.nombre,a.referencia,a.stock,a.precio_coste,
           a.stock*a.precio_coste AS valor_inmovilizado,
           MAX(m.fecha) AS ultimo_movimiento
    FROM articulos a LEFT JOIN movimientos m ON m.articulo_id=a.id
    WHERE a.activo=1 AND a.stock>0
    GROUP BY a.id HAVING ultimo_movimiento IS NULL OR ultimo_movimiento<datetime('now','-60 days')
    ORDER BY valor_inmovilizado DESC LIMIT 10`);

  res.json({ rotacion, valorPorFamilia, graficaDiaria, rendimientoProveedores, stockInmovilizado: filas(stockInmovilizado) });
}

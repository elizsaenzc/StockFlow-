import { run, all, first, guardarBD } from './database.js';
import bcrypt from 'bcryptjs';

export function seedIfEmpty() {
  const cuenta = first('SELECT COUNT(*) as n FROM usuarios')?.n ?? 0;
  if (cuenta > 0) return;

  // ── Usuarios ────────────────────────────────────────────────────────────
  const usuarios = [
    ['admin',    bcrypt.hashSync('admin123',  10), 'administrador', 'Carlos Méndez',       'carlos.mendez@distribuciones-iberia.es'],
    ['almacen',  bcrypt.hashSync('almacen123',10), 'operario',      'Francisco Molina',    'f.molina@distribuciones-iberia.es'],
    ['compras',  bcrypt.hashSync('compras123',10), 'responsable',   'Beatriz Sanz',        'b.sanz@distribuciones-iberia.es'],
    ['consultor',bcrypt.hashSync('visor123',  10), 'consultor',     'Pedro Ibáñez',        'p.ibanez@distribuciones-iberia.es'],
  ];
  usuarios.forEach(u => run('INSERT INTO usuarios (nombre_usuario, contrasena, rol, nombre_completo, correo) VALUES (?,?,?,?,?)', u));

  // ── Almacenes ────────────────────────────────────────────────────────────
  const almacenes = [
    ['Almacén Principal',    'Polígono Industrial El Pomar, Nave 7',  'Alcalá de Henares', 'Francisco Molina'],
    ['Centro Logístico Sur', 'Av. de la Economía 34, Módulo B',       'Getafe',            'Rosa Domínguez'],
    ['Delegación Este',      'Calle Industria 12, Naves 3-4',         'Mollet del Vallès', 'Jordi Puigdomènech'],
    ['Depósito Norte',       'Zona Franca Industrial, Parcela 9',     'Vitoria-Gasteiz',   'Amaia Etxeberria'],
  ];
  almacenes.forEach(a => run('INSERT INTO almacenes (nombre, direccion, ciudad, responsable) VALUES (?,?,?,?)', a));

  // ── Familias (categorías) ──────────────────────────────────────────────
  const familias = [
    ['Ferretería y Bricolaje', '#34D399'],
    ['Material Eléctrico',     '#6C7FFF'],
    ['Fontanería',             '#29C6E8'],
    ['Herramientas Manuales',  '#FBBF24'],
    ['Protección y EPI',       '#F87171'],
    ['Material de Oficina',    '#C084FC'],
    ['Limpieza Industrial',    '#FB923C'],
    ['Pintura y Revestimiento','#4ADE80'],
  ];
  familias.forEach(f => run('INSERT INTO familias (nombre, color) VALUES (?,?)', f));

  // ── Proveedores ───────────────────────────────────────────────────────
  const proveedores = [
    ['Ferretería Beltrán y Cía.',  'Antonio Beltrán',  'abeltrán@beltranfer.es',        '+34 916 234 567', 'Calle Mayor 45, Leganés',              'España', 5,  'Pago a 30 días',       8.7],
    ['Electrodistribución Ruiz',   'Marta Ruiz',       'mruiz@electrodistrib.es',        '+34 935 678 901', 'Polígono Industrial La Plana, Barcelona','España', 7,  'Pago a 60 días',       7.9],
    ['Fontanería García Hnos.',    'Juan García',      'jgarcia@fontinagarciahnos.es',   '+34 952 112 233', 'Calle Feria 88, Málaga',               'España', 4,  'Contado',              9.2],
    ['Suministros Castellano S.A.','Rafael Castellano','rcastellano@suministros-cas.es', '+34 983 445 566', 'Avda. Burgos 120, Valladolid',         'España', 10, 'Pago a 30 días',       6.8],
    ['Grupo Pinturas Mediterráneo','Lucía Ferrer',     'lferrer@pintmediterraneo.es',    '+34 961 778 899', 'Calle Jaén 7, Valencia',               'España', 6,  'Pago a 30 días',       8.1],
    ['Distribuciones Asturianas',  'Pelayo Martínez',  'pmartinez@distastur.es',         '+34 985 001 122', 'Polígono Costa Verde, Gijón',          'España', 14, 'Pago a 60 días',       7.3],
  ];
  proveedores.forEach(p => run('INSERT INTO proveedores (nombre,contacto,correo,telefono,direccion,pais,plazo_entrega,condiciones_pago,puntuacion) VALUES (?,?,?,?,?,?,?,?,?)', p));

  // Helpers
  const famId  = n => first('SELECT id FROM familias WHERE nombre=?',   [n])?.id;
  const provId = n => first('SELECT id FROM proveedores WHERE nombre=?', [n])?.id;
  const almId  = n => first('SELECT id FROM almacenes WHERE nombre=?',   [n])?.id;

  const aP  = almId('Almacén Principal');
  const aCL = almId('Centro Logístico Sur');
  const aE  = almId('Delegación Este');
  const aN  = almId('Depósito Norte');

  // ── Artículos (35 referencias reales) ──────────────────────────────────
  // [referencia, codBarras, nombre, descripcion, familia_id, proveedor_id, unidad,
  //  stock, stock_minimo, stock_maximo, punto_reorden, cant_reorden,
  //  precio_coste, precio_venta, almacen_id, ubicacion]
  const articulos = [
    // Ferretería y Bricolaje
    ['ART-0001','8424503001001','Tornillo métrico M8×50 DIN 933 galvanizado',  'Caja 200 ud. Acero galvanizado 8.8',     famId('Ferretería y Bricolaje'),    provId('Ferretería Beltrán y Cía.'),   'cj',  18, 5,  40, 7,  10, 3.80,  7.50,  aP,  'A-01-1'],
    ['ART-0002','8424503001002','Tornillo madera 4×40 PZ2 zincado',            'Caja 500 ud. Cabeza plana Pozi',         famId('Ferretería y Bricolaje'),    provId('Ferretería Beltrán y Cía.'),   'cj',  24, 8,  60, 10, 15, 2.10,  4.20,  aP,  'A-01-2'],
    ['ART-0003','8424503001003','Brida nailon blanca 4,8×200mm',               'Bolsa 100 ud. Resistencia 22 kg',        famId('Ferretería y Bricolaje'),    provId('Ferretería Beltrán y Cía.'),   'bl',  45,10, 100,15, 25, 1.95,  3.90,  aP,  'A-01-3'],
    ['ART-0004','8424503001004','Perfil ángulo aluminio 30×30×2 mm',           'Barra 2 m, alas iguales',                famId('Ferretería y Bricolaje'),    provId('Ferretería Beltrán y Cía.'),   'ud',  30, 8,  80,10, 20, 4.20,  8.50,  aP,  'A-02-1'],
    ['ART-0005','8424503001005','Anclaje químico vinílico 300 ml',             'Cartucho bimaterial hormigón y piedra',  famId('Ferretería y Bricolaje'),    provId('Distribuciones Asturianas'),   'ud',   6, 5,  25, 7,  10, 8.40, 16.90,  aCL, 'B-01-1'],
    // Material Eléctrico
    ['ART-0006','8424503002001','Cable RV-K 3×1,5 mm² libre halógenos',       'Rollo 100 m, manguera flexible',         famId('Material Eléctrico'),        provId('Electrodistribución Ruiz'),    'rl',  12, 4,  25, 5,   8,28.50, 54.00, aP,  'B-01-1'],
    ['ART-0007','8424503002002','Toma de corriente 16 A Schuko superficie',    'IP44, gris claro, bornes tornillo',      famId('Material Eléctrico'),        provId('Electrodistribución Ruiz'),    'ud',  55,15, 150,20, 30, 2.60,  5.30,  aP,  'B-01-2'],
    ['ART-0008','8424503002003','Interruptor automático 10 A curva C 1P',      'PIA magnetotérmico DIN 45 mm',           famId('Material Eléctrico'),        provId('Electrodistribución Ruiz'),    'ud',  38,10, 100,15, 25, 4.80,  9.60,  aP,  'B-02-1'],
    ['ART-0009','8424503002004','Canaleta PVC blanca 40×25 mm tapa',           'Barra 2 m, ranurada, tapa articulada',  famId('Material Eléctrico'),        provId('Electrodistribución Ruiz'),    'ud',  80,20, 200,25, 40, 1.85,  3.70,  aP,  'B-02-2'],
    ['ART-0010','8424503002005','Luminaria LED panel empotrado 60×60 36 W',    'Temperatura 4000 K, flujo 3600 lm',      famId('Material Eléctrico'),        provId('Electrodistribución Ruiz'),    'ud',   9, 3,  20, 4,   6,24.00, 48.50, aE,  'B-03-1'],
    // Fontanería
    ['ART-0011','8424503003001','Tubo cobre rígido 22 mm × 5 m',              'EN 1057, recocido, para instalaciones',  famId('Fontanería'),                provId('Fontanería García Hnos.'),     'ud',  16, 5,  35, 6,  10,14.20, 27.90, aP,  'C-01-1'],
    ['ART-0012','8424503003002','Válvula de esfera paso total ½"',             'PN 25, latón niquelado, maneta roja',    famId('Fontanería'),                provId('Fontanería García Hnos.'),     'ud',  42,10,  90,15, 20, 3.10,  6.30,  aP,  'C-01-2'],
    ['ART-0013','8424503003003','Colector latón 1" 5 derivaciones ½"',         'Para calefacción y suelo radiante',      famId('Fontanería'),                provId('Fontanería García Hnos.'),     'ud',   7, 3,  18, 4,   6,18.70, 37.50, aP,  'C-02-1'],
    ['ART-0014','8424503003004','Cinta de teflón 12 mm × 12 m (pack 10)',      'PTFE blanco, espesor 0,075 mm',          famId('Fontanería'),                provId('Fontanería García Hnos.'),     'pk',  60,15, 150,20, 30, 0.90,  1.80,  aP,  'C-02-2'],
    ['ART-0015','8424503003005','Grifo monomando fregadero cromo ref. G-200',  'Caño giratorio, aireador M24',           famId('Fontanería'),                provId('Fontanería García Hnos.'),     'ud',  11, 4,  25, 5,   8,32.00, 64.90, aCL, 'C-03-1'],
    // Herramientas Manuales
    ['ART-0016','8424503004001','Nivel de burbuja aluminio 60 cm',             '3 burbujas, precisión ±0,5 mm/m',        famId('Herramientas Manuales'),     provId('Ferretería Beltrán y Cía.'),   'ud',  14, 4,  30, 5,   8, 9.50, 18.90, aP,  'D-01-1'],
    ['ART-0017','8424503004002','Martillo de bola 500 g mango fibra',          'Cabeza forjada, mango antivibración',    famId('Herramientas Manuales'),     provId('Distribuciones Asturianas'),   'ud',  20, 6,  45, 8,  12, 8.20, 16.50, aP,  'D-01-2'],
    ['ART-0018','8424503004003','Juego destornilladores 6 piezas Pozi/Plano',  'Mango tricomponente ergonómico',         famId('Herramientas Manuales'),     provId('Distribuciones Asturianas'),   'jg',  18, 5,  40, 6,  10,11.40, 22.80, aP,  'D-02-1'],
    ['ART-0019','8424503004004','Llave ajustable 250 mm apertura 30 mm',       'Acero al cromo vanadio, cromada',        famId('Herramientas Manuales'),     provId('Distribuciones Asturianas'),   'ud',  15, 5,  35, 6,   8, 7.80, 15.60, aP,  'D-02-2'],
    ['ART-0020','8424503004005','Taladro percutor 850 W con maletín',          'Reversible, 13 velocidades, portabrocas 13mm',famId('Herramientas Manuales'),provId('Suministros Castellano S.A.'), 'ud',   5, 2,  12, 3,   4,54.00,109.00, aP,  'D-03-1'],
    // Protección y EPI
    ['ART-0021','8424503005001','Casco de seguridad ABS blanco clase C',       'EN 397, con ranuras para accesorios',    famId('Protección y EPI'),          provId('Distribuciones Asturianas'),   'ud',  28, 8,  60,10,  15, 4.90,  9.80,  aP,  'E-01-1'],
    ['ART-0022','8424503005002','Guante de nitrilo talla L caja 100 ud.',      'Sin polvo, desechable azul',             famId('Protección y EPI'),          provId('Suministros Castellano S.A.'), 'cj',  32, 8,  80,12,  20, 7.80, 15.60, aP,  'E-01-2'],
    ['ART-0023','8424503005003','Gafas de protección panorámicas incoloras',   'Policarbonato, antiempañante, EN 166',   famId('Protección y EPI'),          provId('Distribuciones Asturianas'),   'ud',  40,10,  90,15,  20, 3.20,  6.40,  aCL, 'E-02-1'],
    ['ART-0024','8424503005004','Arnés de seguridad clase A 1 punto anclaje',  'EN 361, poliéster, ajuste rápido',       famId('Protección y EPI'),          provId('Distribuciones Asturianas'),   'ud',   4, 2,  10, 3,   4,38.00, 76.00, aP,  'E-02-2'],
    ['ART-0025','8424503005005','Tapón auricular espuma 35 dB par (caja 200)', 'EN 352-2, SNR 35, código de colores',    famId('Protección y EPI'),          provId('Suministros Castellano S.A.'), 'cj',  22, 6,  50, 8,  12, 9.50, 18.90, aP,  'E-03-1'],
    // Material de Oficina
    ['ART-0026','8424503006001','Papel multifunción A4 80 g/m² resma 500 h',  'Blancura CIE 161, apto impresión doble',famId('Material de Oficina'),        provId('Suministros Castellano S.A.'), 'rs',  48,15, 150,20,  30, 3.10,  6.20,  aN,  'F-01-1'],
    ['ART-0027','8424503006002','Archivador palanca A4 lomo 75 mm cartón',     'Cubierta plastificada, anillas Ø35 mm', famId('Material de Oficina'),        provId('Suministros Castellano S.A.'), 'ud',  36,10,  90,15,  20, 1.95,  3.90,  aN,  'F-01-2'],
    ['ART-0028','8424503006003','Bolígrafos retráctiles azul pack 12 ud.',     'Punta 1 mm, tinta aceite, grip goma',   famId('Material de Oficina'),        provId('Suministros Castellano S.A.'), 'pk',  55,15, 120,18,  25, 2.20,  4.40,  aN,  'F-02-1'],
    // Limpieza Industrial
    ['ART-0029','8424503007001','Detergente industrial desengrasante 5 L',     'pH 12, biodegradable, sin fosfatos',    famId('Limpieza Industrial'),        provId('Distribuciones Asturianas'),   'gf',  20, 6,  50, 8,  12,12.50, 24.90, aCL, 'G-01-1'],
    ['ART-0030','8424503007002','Fregona industrial algodón 250 g con palo',   'Palo telescópico 130 cm aluminio',      famId('Limpieza Industrial'),        provId('Distribuciones Asturianas'),   'ud',  25, 8,  60,10,  15, 4.40,  8.80,  aCL, 'G-01-2'],
    ['ART-0031','8424503007003','Bolsa basura industrial 120 L azul (rollo 10)','Galga 200, 70×110 cm, asa fácil',      famId('Limpieza Industrial'),        provId('Suministros Castellano S.A.'), 'rl',  38,10,  80,15,  20, 3.60,  7.20,  aCL, 'G-02-1'],
    // Pintura y Revestimiento
    ['ART-0032','8424503008001','Esmalte sintético satinado blanco nieve 4 L', 'Secado 4 h, rendimiento 12 m²/L',       famId('Pintura y Revestimiento'),   provId('Grupo Pinturas Mediterráneo'), 'ud',  16, 5,  35, 6,   8,19.80, 39.50, aCL, 'H-01-1'],
    ['ART-0033','8424503008002','Pintura plástica interior mate blanca 15 L',  'Lavable, bajo VOC, cubrición alta',     famId('Pintura y Revestimiento'),   provId('Grupo Pinturas Mediterráneo'), 'ud',  12, 4,  30, 5,   8,22.00, 44.00, aCL, 'H-01-2'],
    ['ART-0034','8424503008003','Rodillo lana natural 23 cm con mango',        'Felpa 13 mm, antiescurrimiento',         famId('Pintura y Revestimiento'),   provId('Grupo Pinturas Mediterráneo'), 'ud',  30, 8,  70,12,  15, 3.80,  7.60,  aCL, 'H-02-1'],
    ['ART-0035','8424503008004','Imprimación selladora paredes y techos 5 L',  'Base agua, fijador y nivelador',         famId('Pintura y Revestimiento'),   provId('Grupo Pinturas Mediterráneo'), 'ud',   9, 3,  20, 4,   6,14.90, 29.80, aCL, 'H-02-2'],
  ];

  // Algunos artículos por debajo del mínimo para que las alertas tengan contenido
  const BAJO = ['ART-0005', 'ART-0006', 'ART-0026', 'ART-0033'];
  const SIN_STOCK = ['ART-0012', 'ART-0021'];
  articulos.forEach(a => {
    if (BAJO.includes(a[0]))      a[7] = Math.max(1, a[8] - 2);
    if (SIN_STOCK.includes(a[0])) a[7] = 0;
    run(`INSERT INTO articulos
      (referencia,cod_barras,nombre,descripcion,familia_id,proveedor_id,unidad,
       stock,stock_minimo,stock_maximo,punto_reorden,cant_reorden,
       precio_coste,precio_venta,almacen_id,ubicacion)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, a);
  });

  // ── Movimientos de los últimos 60 días ───────────────────────────────
  // Se generan hacia atrás desde el stock actual para que el historial cuadre:
  // el stock_despues de cada movimiento es el stock_antes del siguiente.
  const todosArts = all('SELECT id, stock, almacen_id FROM articulos');
  const motivosSalida  = ['Entrega a cliente', 'Suministro a obra Calle Mayor 12', 'Consumo interno mantenimiento', 'Merma por rotura en almacén'];
  const motivosEntrada = ['Reposición desde proveedor', 'Devolución de obra', 'Transferencia entre almacenes'];
  const anio = new Date().getFullYear();
  const fechaHace = (dias, hora) => {
    const f = new Date(); f.setDate(f.getDate() - dias); f.setHours(hora, (dias * 7) % 60, 0, 0);
    return f.toISOString().replace('T', ' ').slice(0, 19);
  };

  // Generador pseudoaleatorio con semilla: datos variados pero siempre iguales entre arranques
  let semilla = 20250417;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };

  const pendientes = [];
  const actual = new Map(todosArts.map(a => [a.id, parseFloat(a.stock) || 0]));
  let n = 0;
  for (let dias = 0; dias < 60; dias++) {
    const fecha = new Date(); fecha.setDate(fecha.getDate() - dias);
    const finde = fecha.getDay() === 0 || fecha.getDay() === 6;
    const delDia = finde ? Math.floor(azar() * 2) : 2 + Math.floor(azar() * 6);
    for (let k = 0; k < delDia; k++, n++) {
      const art  = todosArts[Math.floor(azar() * todosArts.length)];
      const despues = actual.get(art.id);
      // Hacia atrás: una salida implica que antes había más; una entrada, que había menos
      let tipo = azar() < 0.62 ? 'salida' : 'entrada';
      const cant = tipo === 'salida' ? 1 + Math.floor(azar() * 6) : 4 + Math.floor(azar() * 12);
      if (tipo === 'entrada' && despues - cant < 0) tipo = 'salida';
      const antes = tipo === 'salida' ? despues + cant : despues - cant;
      actual.set(art.id, antes);
      const motivo = tipo === 'salida' ? motivosSalida[n % motivosSalida.length] : motivosEntrada[n % motivosEntrada.length];
      const ref = tipo === 'salida' ? `ALB-${anio}-${String(100 + n).padStart(3, '0')}` : `OC-${anio}-${String(1 + (n % 9)).padStart(3, '0')}`;
      pendientes.push([art.id, art.almacen_id, tipo, cant, antes, despues, motivo, ref, fechaHace(dias, 18 - k)]);   // hacia atrás: horas decrecientes
    }
  }
  // Alta inicial de cada artículo con el stock que tenía al principio del periodo
  todosArts.forEach(a => {
    const inicial = actual.get(a.id);
    if (inicial > 0) pendientes.push([a.id, a.almacen_id, 'entrada', inicial, 0, inicial, 'Alta inicial de artículo', null, fechaHace(120, 9)]);
  });
  pendientes.forEach(m => run(`INSERT INTO movimientos
      (articulo_id,almacen_id,tipo,cantidad,stock_antes,stock_despues,motivo,referencia,fecha,usuario_id)
      VALUES (?,?,?,?,?,?,?,?,?,1)`, m));

  // ── Pedidos de compra ─────────────────────────────────────────────────
  const fechaEn = dias => { const f = new Date(); f.setDate(f.getDate() + dias); return f.toISOString().slice(0, 10); };
  const pedido = (n, prov, alm, estado, diasEntrega, diasAlta, notas, lineas) => {
    const total = lineas.reduce((s, [, q, c]) => s + (q * c), 0);
    const r = run(`INSERT INTO pedidos_compra
      (numero_pedido,proveedor_id,almacen_id,estado,fecha_esperada,importe_total,notas,creado_por,fecha_alta)
      VALUES (?,?,?,?,?,?,?,1,?)`,
      [`PC-${anio}-${String(n).padStart(3, '0')}`, provId(prov), almId(alm), estado, fechaEn(diasEntrega), total, notas, fechaHace(diasAlta, 10)]);
    lineas.forEach(([ref, qty, coste, rcv]) => {
      const artId = first('SELECT id FROM articulos WHERE referencia=?', [ref])?.id;
      if (artId) run(`INSERT INTO lineas_pedido
        (pedido_id,articulo_id,cantidad_pedida,precio_unitario,cantidad_recibida)
        VALUES (?,?,?,?,?)`, [r.ultimoId, artId, qty, coste, rcv ?? 0]);
    });
  };

  pedido(1, 'Ferretería Beltrán y Cía.',   'Almacén Principal',    'recibido', -20, 30, 'Reposición trimestral ferretería',
    [['ART-0001', 20, 3.80, 20], ['ART-0002', 30, 2.10, 30], ['ART-0003', 25, 1.95, 25]]);
  pedido(2, 'Fontanería García Hnos.',     'Centro Logístico Sur', 'recibido', -12, 18, 'Surtido fontanería',
    [['ART-0011', 10, 14.20, 10], ['ART-0012', 25, 3.10, 25], ['ART-0014', 30, 0.90, 30]]);
  pedido(3, 'Grupo Pinturas Mediterráneo', 'Centro Logístico Sur', 'parcial',   -2, 12, 'Surtido pintura y revestimiento',
    [['ART-0032', 10, 19.80, 6], ['ART-0033', 8, 22.00, 4], ['ART-0034', 15, 3.80, 0]]);
  pedido(4, 'Electrodistribución Ruiz',    'Almacén Principal',    'enviado',     4,  5, 'Material eléctrico obra nave industrial',
    [['ART-0006', 8, 28.50, 0], ['ART-0008', 20, 4.80, 0], ['ART-0009', 40, 1.85, 0]]);
  pedido(5, 'Suministros Castellano S.A.', 'Depósito Norte',       'enviado',     8,  3, 'Material de oficina y EPI',
    [['ART-0026', 30, 3.10, 0], ['ART-0025', 12, 9.50, 0], ['ART-0022', 10, 7.80, 0]]);
  pedido(6, 'Distribuciones Asturianas',   'Almacén Principal',    'borrador',   15,  1, 'Reposición EPI de temporada',
    [['ART-0021', 20, 4.90, 0], ['ART-0022', 15, 7.80, 0], ['ART-0023', 20, 3.20, 0]]);

  guardarBD();
}

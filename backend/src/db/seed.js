import { run, all, first, guardarBD } from './database.js';
import bcrypt from 'bcryptjs';

/**
 * Datos de demostración de Distribuciones Iberia, un almacén de suministro industrial.
 *
 * El catálogo usa productos y marcas habituales del sector (Schneider, Simon, Grohe, Roca,
 * Bosch, Stanley, 3M, Fischer, Sika…) con precios orientativos de mercado. La empresa,
 * sus proveedores y sus clientes son ficticios. Los códigos EAN son internos (prefijo 84)
 * con dígito de control válido.
 */
export function seedIfEmpty() {
  const cuenta = first('SELECT COUNT(*) as n FROM usuarios')?.n ?? 0;
  if (cuenta > 0) return;

  // ── Usuarios ────────────────────────────────────────────────────────────
  const usuarios = [
    ['admin',     bcrypt.hashSync('admin123',   10), 'administrador', 'Carlos Méndez',    'carlos.mendez@distribuciones-iberia.es'],
    ['almacen',   bcrypt.hashSync('almacen123', 10), 'operario',      'Francisco Molina', 'f.molina@distribuciones-iberia.es'],
    ['compras',   bcrypt.hashSync('compras123', 10), 'responsable',   'Beatriz Sanz',     'b.sanz@distribuciones-iberia.es'],
    ['consultor', bcrypt.hashSync('visor123',   10), 'consultor',     'Pedro Ibáñez',     'p.ibanez@distribuciones-iberia.es'],
  ];
  usuarios.forEach(u => run('INSERT INTO usuarios (nombre_usuario, contrasena, rol, nombre_completo, correo) VALUES (?,?,?,?,?)', u));

  // ── Almacenes ────────────────────────────────────────────────────────────
  const almacenes = [
    ['Almacén Principal',    'Polígono Industrial Puerta de Madrid, C/ Mario Vargas Llosa 6', 'Alcalá de Henares', 'Francisco Molina'],
    ['Centro Logístico Sur', 'Polígono Los Olivos, C/ Laboriosidad 14, Nave B',               'Getafe',            'Rosa Domínguez'],
    ['Delegación Este',      'Polígono Can Magarola, C/ Industria 12',                        'Mollet del Vallès', 'Jordi Puigdomènech'],
    ['Depósito Norte',       'Polígono Júndiz, C/ Lermandabide 9',                            'Vitoria-Gasteiz',   'Amaia Etxeberria'],
  ];
  almacenes.forEach(a => run('INSERT INTO almacenes (nombre, direccion, ciudad, responsable) VALUES (?,?,?,?)', a));

  // ── Familias ────────────────────────────────────────────────────────────
  const familias = [
    ['Ferretería y Fijación',   '#34C759'],
    ['Material Eléctrico',      '#007AFF'],
    ['Fontanería',              '#32ADE6'],
    ['Herramientas',            '#FF9F0A'],
    ['Protección y EPI',        '#FF3B30'],
    ['Material de Oficina',     '#AF52DE'],
    ['Limpieza Industrial',     '#5AC8FA'],
    ['Pintura y Revestimiento', '#FFCC00'],
  ];
  familias.forEach(f => run('INSERT INTO familias (nombre, color) VALUES (?,?)', f));

  // ── Proveedores (distribuidores ficticios) ──────────────────────────────
  const proveedores = [
    ['Ferretería Beltrán y Cía.',      'Antonio Beltrán',  'pedidos@beltranferreteria.es',    '+34 916 234 567', 'C/ Mayor 45, 28914 Leganés',                 'España', 3,  'Pago a 30 días', 8.7],
    ['Electrodistribución Ruiz',       'Marta Ruiz',       'comercial@electroruiz.es',         '+34 935 678 901', 'Pol. Ind. La Plana, 08840 Viladecans',       'España', 5,  'Pago a 60 días', 8.2],
    ['Fontanería García Hnos.',        'Juan García',      'jgarcia@garciahnos-fontaneria.es', '+34 952 112 233', 'C/ Feria 88, 29012 Málaga',                  'España', 4,  'Contado',        9.1],
    ['Suministros Industriales Nervión','Iker Zubizarreta', 'ventas@sumnervion.es',            '+34 944 556 677', 'Pol. Ind. Artunduaga, 48970 Basauri',        'España', 6,  'Pago a 45 días', 7.6],
    ['Seguridad Laboral Castellana',   'Rafael Castellano','pedidos@seglaboralcastellana.es',  '+34 983 445 566', 'Av. de Burgos 120, 47009 Valladolid',        'España', 7,  'Pago a 30 días', 6.9],
    ['Ofiservice Madrid',              'Laura Pineda',     'clientes@ofiservicemadrid.es',     '+34 915 778 210', 'C/ Albasanz 75, 28037 Madrid',               'España', 2,  'Pago a 30 días', 8.4],
    ['Higiene y Limpieza Levante',     'Vicente Ferrer',   'pedidos@higienelevante.es',        '+34 961 220 314', 'Pol. Ind. Fuente del Jarro, 46988 Paterna',  'España', 5,  'Pago a 30 días', 7.8],
    ['Grupo Pinturas Mediterráneo',    'Lucía Ferrer',     'lferrer@pintmediterraneo.es',      '+34 961 778 899', 'C/ Jaén 7, 46470 Catarroja',                 'España', 6,  'Pago a 60 días', 8.0],
  ];
  proveedores.forEach(p => run('INSERT INTO proveedores (nombre,contacto,correo,telefono,direccion,pais,plazo_entrega,condiciones_pago,puntuacion) VALUES (?,?,?,?,?,?,?,?,?)', p));

  const famId  = n => first('SELECT id FROM familias WHERE nombre=?',    [n])?.id;
  const provId = n => first('SELECT id FROM proveedores WHERE nombre=?', [n])?.id;
  const almId  = n => first('SELECT id FROM almacenes WHERE nombre=?',   [n])?.id;
  const P = almId('Almacén Principal'), S = almId('Centro Logístico Sur'), E = almId('Delegación Este'), N = almId('Depósito Norte');

  // EAN-13 interno con dígito de control correcto
  let secuencia = 1000;
  const ean = () => {
    const base = `8437${String(secuencia++).padStart(8, '0')}`;
    const suma = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
    return base + ((10 - (suma % 10)) % 10);
  };

  // [referencia, nombre, descripción, unidad, stock, mínimo, máximo, reorden, cant. reorden, coste, PVP, almacén, ubicación]
  const catalogo = {
    'Ferretería y Fijación': ['Ferretería Beltrán y Cía.', [
      ['FER-0101', 'Taco nylon Fischer SX 8×40 (caja 100)',          'Taco universal de expansión para hormigón y ladrillo', 'cj', 42, 10, 80, 15, 30,  6.90, 12.95, P, 'A-01-1'],
      ['FER-0102', 'Tornillo Spax 4×40 Torx T20 zincado (caja 500)', 'Rosca parcial, cabeza avellanada, punta CUT',          'cj', 26,  8, 50, 10, 20, 18.40, 32.90, P, 'A-01-2'],
      ['FER-0103', 'Tornillo DIN 933 M8×50 8.8 zincado (caja 100)',  'Cabeza hexagonal, rosca total',                        'cj', 18,  5, 40,  8, 15,  9.80, 17.50, P, 'A-01-3'],
      ['FER-0104', 'Anclaje químico Fischer FIS V 360 S',            'Mortero de inyección viniléster para cargas pesadas',  'ud', 14,  6, 30,  8, 12, 14.60, 26.90, S, 'B-01-1'],
      ['FER-0105', 'Silicona neutra Sika Sikasil C transparente 300 ml', 'Sellado de juntas, curado neutro',                 'ud', 64, 20,120, 30, 48,  4.10,  7.95, P, 'A-02-1'],
      ['FER-0106', 'Espuma poliuretano Soudal Gun Foam 750 ml',      'Espuma de montaje para pistola, clase B3',             'ud', 30, 12, 60, 15, 24,  6.20, 11.40, S, 'B-01-2'],
      ['FER-0107', 'Brida nylon Legrand Colring 4,6×200 (bolsa 100)','Brida negra resistente a UV',                          'bl', 55, 15,100, 20, 40,  5.30,  9.80, P, 'A-02-2'],
    ]],
    'Material Eléctrico': ['Electrodistribución Ruiz', [
      ['ELE-0201', 'Cable Top Cable Toxfree RZ1-K 3G2,5 mm² (rollo 100 m)', 'Libre de halógenos, 0,6/1 kV',                 'rl',  9,  3, 20,  4,  6, 128.00, 214.00, P, 'C-01-1'],
      ['ELE-0202', 'Cable H07V-K 1,5 mm² azul (rollo 100 m)',        'Unipolar flexible para instalación interior',          'rl', 16,  5, 30,  6, 10, 21.50,  38.90, P, 'C-01-2'],
      ['ELE-0203', 'Magnetotérmico Schneider Acti9 iC60N 2P 16 A',   'Curva C, poder de corte 6 kA',                         'ud', 38, 10, 70, 15, 30, 17.80,  32.40, P, 'C-02-1'],
      ['ELE-0204', 'Diferencial Hager CDC240J 2P 40 A 30 mA',        'Clase AC, montaje en carril DIN',                      'ud', 12,  6, 30,  8, 12, 34.90,  61.50, P, 'C-02-2'],
      ['ELE-0205', 'Interruptor Simon 27 Play blanco',               'Mecanismo con tecla y marco, 10 AX 250 V',             'ud', 80, 25,150, 40, 60,  4.40,   8.20, E, 'E-01-1'],
      ['ELE-0206', 'Base Schuko Niessen Zenit blanca',               'Base de enchufe 16 A con toma de tierra',              'ud', 72, 25,150, 40, 60,  5.10,   9.40, E, 'E-01-2'],
      ['ELE-0207', 'Tubo corrugado Aiscan 20 mm gris (rollo 100 m)', 'Tubo flexible reforzado para empotrar',                'rl', 22,  6, 40, 10, 15, 16.30,  29.90, P, 'C-03-1'],
      ['ELE-0208', 'Bombilla LED Philips E27 8,5 W 2700 K (pack 3)', 'Equivalente a 60 W, 806 lm',                           'pk', 46, 15, 90, 20, 36,  6.80,  12.90, E, 'E-02-1'],
      ['ELE-0209', 'Pantalla LED Philips CoreLine 120 cm 36 W',      'Luminaria estanca IP65, 4000 K',                       'ud', 10,  4, 24,  6, 10, 38.50,  69.00, S, 'D-01-1'],
    ]],
    'Fontanería': ['Fontanería García Hnos.', [
      ['FON-0301', 'Grifo fregadero Grohe Eurosmart caño alto',      'Monomando cromado, cartucho cerámico 46 mm',           'ud',  7,  3, 15,  4,  6, 72.00, 129.00, S, 'F-01-1'],
      ['FON-0302', 'Grifo lavabo Roca L20 monomando',                'Cromado, desagüe automático incluido',                 'ud',  9,  4, 18,  5,  8, 49.50,  89.90, S, 'F-01-2'],
      ['FON-0303', 'Llave de paso Arco Tajo 1/2" esfera',            'Latón cromado, mando mariposa',                        'ud', 34, 10, 60, 15, 24,  5.90,  10.90, S, 'F-02-1'],
      ['FON-0304', 'Tubo multicapa Pexal 16×2 mm (rollo 100 m)',     'PE-RT/Al/PE-RT para agua y calefacción',               'rl',  6,  2, 12,  3,  4, 96.00, 165.00, S, 'F-03-1'],
      ['FON-0305', 'Codo latón 90° H-H 1/2" (bolsa 10)',              'Rosca hembra-hembra',                                  'bl', 28,  8, 50, 12, 20,  9.40,  16.90, S, 'F-02-2'],
      ['FON-0306', 'Cinta teflón 12 mm × 12 m (pack 10)',             'Sellado de roscas para agua y gas',                    'pk', 40, 12, 80, 15, 30,  3.20,   6.50, S, 'F-02-3'],
      ['FON-0307', 'Sifón botella Jimten S-91 1 1/4"',                'Sifón regulable para lavabo, polipropileno',           'ud', 25,  8, 45, 10, 20,  4.70,   8.90, S, 'F-02-4'],
      ['FON-0308', 'Latiguillo flexible 1/2"–3/8" 35 cm',             'Malla de acero inoxidable, agua fría y caliente',      'ud', 60, 20,120, 25, 50,  2.10,   4.30, S, 'F-02-5'],
    ]],
    'Herramientas': ['Suministros Industriales Nervión', [
      ['HER-0401', 'Taladro percutor Bosch GSB 18V-55 (sin batería)', 'Sin escobillas, par 55 Nm, portabrocas 13 mm',         'ud',  5,  2, 10,  3,  4, 92.00, 159.00, P, 'H-01-1'],
      ['HER-0402', 'Batería Bosch ProCORE 18V 4,0 Ah',                'Compatible con la gama profesional 18 V',               'ud',  8,  3, 15,  4,  6, 64.00, 112.00, P, 'H-01-2'],
      ['HER-0403', 'Disco de corte Bosch Expert Inox 125 mm (pack 10)','Para amoladora, metal e inoxidable',                  'pk', 20,  6, 40, 10, 15, 11.90,  21.50, P, 'H-02-1'],
      ['HER-0404', 'Martillo de carpintero Stanley 450 g',            'Mango de fibra de vidrio antivibración',               'ud', 16,  5, 30,  6, 12,  9.60,  17.90, P, 'H-02-2'],
      ['HER-0405', 'Flexómetro Stanley FatMax 5 m',                   'Cinta de 32 mm con recubrimiento Mylar',               'ud', 24,  8, 45, 10, 20,  8.90,  16.50, P, 'H-02-3'],
      ['HER-0406', 'Nivel Stabila 70-2 de 60 cm',                     'Perfil de aluminio, dos burbujas',                     'ud', 11,  4, 20,  5,  8, 21.40,  38.90, N, 'N-01-1'],
      ['HER-0407', 'Destornillador Wera Kraftform 350 PH2×100',        'Mango ergonómico multicomponente',                     'ud', 30, 10, 60, 12, 24,  5.20,   9.70, N, 'N-01-2'],
    ]],
    'Protección y EPI': ['Seguridad Laboral Castellana', [
      ['EPI-0501', 'Casco 3M SecureFit X5501 blanco',                 'Ventilado, ajuste por rueda, EN 397',                  'ud', 10,  8, 40, 10, 20, 24.50,  42.00, P, 'G-01-1'],
      ['EPI-0502', 'Gafas de protección 3M SecureFit 400 incoloras',  'Antivaho y antirrayado, EN 166',                       'ud', 48, 15, 90, 20, 40,  4.80,   8.90, P, 'G-01-2'],
      ['EPI-0503', 'Mascarilla 3M Aura 9322+ FFP2 (caja 10)',          'Con válvula Cool Flow',                                'cj', 22, 10, 50, 12, 20, 21.00,  37.50, N, 'N-02-1'],
      ['EPI-0504', 'Guante nitrilo Ansell TouchNTuff 92-600 talla L (caja 100)', 'Desechable, sin polvo',                   'cj', 30, 10, 60, 15, 24,  9.90,  17.90, N, 'N-02-2'],
      ['EPI-0505', 'Bota de seguridad Paredes Lince S3 talla 42',     'Puntera y plantilla no metálicas, SRC',                'pr',  8,  4, 20,  5, 10, 44.00,  76.00, P, 'G-02-1'],
      ['EPI-0506', 'Chaleco alta visibilidad amarillo talla XL',      'Clase 2, EN ISO 20471',                                'ud', 36, 12, 70, 15, 30,  2.60,   5.50, P, 'G-02-2'],
      ['EPI-0507', 'Tapones auditivos 3M 1100 (caja 200 pares)',      'Espuma desechable, SNR 37 dB',                         'cj',  6,  3, 12,  4,  5, 26.50,  44.90, N, 'N-02-3'],
    ]],
    'Material de Oficina': ['Ofiservice Madrid', [
      ['OFI-0601', 'Papel A4 Navigator Universal 80 g (resma 500)',   'Blanco, multifunción',                                 'rs', 13, 15,120, 20, 60,  4.30,   6.90, N, 'O-01-1'],
      ['OFI-0602', 'Bolígrafo BIC Cristal azul (caja 50)',            'Punta media 1 mm',                                      'cj', 12,  4, 25,  5, 10, 11.50,  19.90, N, 'O-01-2'],
      ['OFI-0603', 'Archivador Esselte A4 lomo 75 mm azul',           'Palanca con rado, cartón forrado',                     'ud', 40, 12, 80, 15, 30,  2.70,   4.90, N, 'O-02-1'],
      ['OFI-0604', 'Tóner HP 26A negro CF226A',                       'Rendimiento 3.100 páginas',                            'ud',  4,  2,  8,  3,  4, 89.00, 135.00, N, 'O-02-2'],
      ['OFI-0605', 'Notas Post-it 76×76 amarillo (pack 12)',           '100 hojas por bloc',                                   'pk', 18,  6, 35,  8, 12,  9.20,  15.90, N, 'O-02-3'],
    ]],
    'Limpieza Industrial': ['Higiene y Limpieza Levante', [
      ['LIM-0701', 'Lejía Conejo 5 L',                                'Lejía apta para desinfección de superficies',          'ud', 30, 10, 60, 12, 24,  3.40,   6.20, S, 'L-01-1'],
      ['LIM-0702', 'Desengrasante KH-7 5 L',                          'Desengrasante concentrado multiusos',                  'ud', 14,  6, 30,  8, 12, 15.90,  27.50, S, 'L-01-2'],
      ['LIM-0703', 'Bayeta microfibra Vileda Professional (pack 10)', 'Código de colores, lavable a 95 °C',                   'pk', 22,  8, 45, 10, 20,  8.60,  14.90, S, 'L-02-1'],
      ['LIM-0704', 'Bolsa de basura industrial 85×105 negra (rollo 10)', 'Galga 200, alta resistencia',                      'rl', 50, 15, 90, 20, 40,  2.90,   5.40, S, 'L-02-2'],
      ['LIM-0705', 'Papel secamanos zigzag (caja 20 paquetes)',       'Doble capa, 3.000 servicios',                          'cj', 11,  5, 25,  6, 10, 18.70,  31.90, S, 'L-02-3'],
    ]],
    'Pintura y Revestimiento': ['Grupo Pinturas Mediterráneo', [
      ['PIN-0801', 'Pintura plástica Titanlux Titanpro mate blanca 15 L', 'Interior y exterior, alta cubrición',            'ud',  8,  4, 20,  5,  8, 44.00,  79.00, S, 'P-01-1'],
      ['PIN-0802', 'Esmalte Bruguer satinado blanco 750 ml',          'Esmalte sintético para madera y metal',                'ud', 26,  8, 50, 10, 20,  9.80,  17.90, S, 'P-01-2'],
      ['PIN-0803', 'Imprimación selladora Montó 4 L',                 'Fijadora al agua para paredes y techos',               'ud', 12,  4, 24,  5, 10, 19.50,  34.90, S, 'P-02-1'],
      ['PIN-0804', 'Masilla Beissier Aguaplast Standard 1 kg',        'Plaste en polvo para rellenar y alisar',               'ud', 34, 10, 60, 12, 24,  3.10,   5.80, S, 'P-02-2'],
      ['PIN-0805', 'Cinta de carrocero tesa 4323 38 mm × 50 m',       'Papel crepé para enmascarar',                          'ud', 60, 20,120, 25, 48,  1.90,   3.60, S, 'P-02-3'],
    ]],
  };

  // Artículos que arrancan bajo mínimo o sin stock (para que haya alertas reales)
  const BAJO      = ['ELE-0201', 'PIN-0801', 'FER-0103', 'OFI-0601', 'EPI-0501'];
  const SIN_STOCK = ['FON-0304', 'HER-0401'];

  for (const [familia, [proveedor, filas]] of Object.entries(catalogo)) {
    for (const [ref, nombre, desc, unidad, stock, min, max, reorden, cantReorden, coste, pvp, alm, ubic] of filas) {
      const inicial = SIN_STOCK.includes(ref) ? 0 : BAJO.includes(ref) ? Math.max(1, min - 2) : stock;
      run(`INSERT INTO articulos
        (referencia,cod_barras,nombre,descripcion,familia_id,proveedor_id,unidad,
         stock,stock_minimo,stock_maximo,punto_reorden,cant_reorden,
         precio_coste,precio_venta,almacen_id,ubicacion)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, ean(), nombre, desc, famId(familia), provId(proveedor), unidad,
         inicial, min, max, reorden, cantReorden, coste, pvp, alm, ubic]);
    }
  }

  // ── Movimientos de los últimos 60 días ───────────────────────────────
  // Se generan hacia atrás desde el stock actual para que el historial cuadre:
  // el stock_despues de cada movimiento es el stock_antes del siguiente.
  const todosArts = all(`SELECT a.id, a.stock, a.almacen_id, p.nombre AS proveedor
                         FROM articulos a LEFT JOIN proveedores p ON p.id = a.proveedor_id`);
  const clientes = [
    'Construcciones Henares S.L.', 'Reformas Integrales Arganda', 'Instalaciones Eléctricas Coslada',
    'Mantenimientos Corredor del Henares', 'Climatización Torrejón S.L.', 'Comunidad de propietarios C/ Libreros 14',
    'Obra nave logística San Fernando', 'Fontanería Hermanos Pardo',
  ];
  const motivosInternos = ['Consumo interno de mantenimiento', 'Merma por rotura en almacén'];
  const anio = new Date().getFullYear();
  const fechaHace = (dias, hora, minuto = (dias * 7) % 60) => {
    const f = new Date(); f.setDate(f.getDate() - dias); f.setHours(hora, minuto, 0, 0);
    return f.toISOString().replace('T', ' ').slice(0, 19);
  };

  // Generador pseudoaleatorio con semilla: datos variados pero iguales en cada arranque
  let semilla = 20250417;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };

  const pendientes = [];
  const actual = new Map(todosArts.map(a => [a.id, parseFloat(a.stock) || 0]));
  let n = 0;
  for (let dias = 0; dias < 60; dias++) {
    const fecha = new Date(); fecha.setDate(fecha.getDate() - dias);
    const finde = fecha.getDay() === 0 || fecha.getDay() === 6;
    const delDia = finde ? Math.floor(azar() * 2) : 3 + Math.floor(azar() * 6);
    for (let k = 0; k < delDia; k++, n++) {
      const art = todosArts[Math.floor(azar() * todosArts.length)];
      const despues = actual.get(art.id);
      let tipo = azar() < 0.64 ? 'salida' : 'entrada';
      const cant = tipo === 'salida' ? 1 + Math.floor(azar() * 6) : 5 + Math.floor(azar() * 15);
      if (tipo === 'entrada' && despues - cant < 0) tipo = 'salida';
      const antes = tipo === 'salida' ? despues + cant : despues - cant;
      actual.set(art.id, antes);

      let motivo, documento;
      if (tipo === 'salida') {
        const interno = azar() < 0.12;
        motivo = interno ? motivosInternos[n % 2] : `Venta a ${clientes[Math.floor(azar() * clientes.length)]}`;
        documento = interno ? null : `ALB-${anio}-${String(2400 - n).padStart(4, '0')}`;
      } else {
        motivo = `Entrada de ${art.proveedor}`;
        documento = `ALB-PROV-${String(800 - n).padStart(4, '0')}`;
      }
      const usuario = [2, 2, 2, 3, 1][Math.floor(azar() * 5)];
      // Hacia atrás en el tiempo: horas decrecientes dentro del día
      pendientes.push([art.id, art.almacen_id, tipo, cant, antes, despues, motivo, documento, fechaHace(dias, 18 - k, Math.floor(azar() * 50)), usuario]);
    }
  }
  // Inventario inicial de cada artículo, antes de la ventana de análisis
  todosArts.forEach(a => {
    const inicial = actual.get(a.id);
    if (inicial > 0) pendientes.push([a.id, a.almacen_id, 'entrada', inicial, 0, inicial, 'Inventario inicial', `INV-${anio - 1}-001`, fechaHace(120, 9), 1]);
  });
  pendientes.forEach(m => run(`INSERT INTO movimientos
      (articulo_id,almacen_id,tipo,cantidad,stock_antes,stock_despues,motivo,referencia,fecha,usuario_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, m));

  // ── Pedidos de compra ─────────────────────────────────────────────────
  const fechaEn = dias => { const f = new Date(); f.setDate(f.getDate() + dias); return f.toISOString().slice(0, 10); };
  const coste = ref => first('SELECT precio_coste FROM articulos WHERE referencia=?', [ref])?.precio_coste ?? 0;
  const pedido = (num, prov, alm, estado, diasEntrega, diasAlta, notas, lineas, autor = 3) => {
    const total = lineas.reduce((s, [ref, q]) => s + q * coste(ref), 0);
    const r = run(`INSERT INTO pedidos_compra
      (numero_pedido,proveedor_id,almacen_id,estado,fecha_esperada,importe_total,notas,creado_por,fecha_alta)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [`PC-${anio}-${String(num).padStart(3, '0')}`, provId(prov), almId(alm), estado, fechaEn(diasEntrega),
       Math.round(total * 100) / 100, notas, autor, fechaHace(diasAlta, 10)]);
    lineas.forEach(([ref, qty, rcv]) => {
      const artId = first('SELECT id FROM articulos WHERE referencia=?', [ref])?.id;
      if (artId) run(`INSERT INTO lineas_pedido (pedido_id,articulo_id,cantidad_pedida,precio_unitario,cantidad_recibida)
        VALUES (?,?,?,?,?)`, [r.ultimoId, artId, qty, coste(ref), rcv ?? 0]);
    });
  };

  pedido(1, 'Ferretería Beltrán y Cía.',        'Almacén Principal',    'recibido', -21, 28, 'Reposición mensual de fijación',
    [['FER-0101', 30, 30], ['FER-0102', 20, 20], ['FER-0105', 48, 48]]);
  pedido(2, 'Fontanería García Hnos.',          'Centro Logístico Sur', 'recibido', -10, 16, 'Pedido obra Reformas Integrales Arganda',
    [['FON-0303', 24, 24], ['FON-0308', 50, 50], ['FON-0306', 30, 30]]);
  pedido(3, 'Grupo Pinturas Mediterráneo',      'Centro Logístico Sur', 'parcial',   -2, 11, 'Campaña de pintura de otoño',
    [['PIN-0802', 20, 12], ['PIN-0804', 24, 24], ['PIN-0803', 10, 0]]);
  pedido(4, 'Electrodistribución Ruiz',         'Almacén Principal',    'enviado',    3,  4, 'Material para obra nave logística San Fernando',
    [['ELE-0203', 30], ['ELE-0204', 12], ['ELE-0207', 15]]);
  pedido(5, 'Seguridad Laboral Castellana',     'Almacén Principal',    'enviado',    6,  2, 'Reposición de EPI',
    [['EPI-0502', 40], ['EPI-0506', 30]]);
  pedido(6, 'Suministros Industriales Nervión', 'Almacén Principal',    'borrador',  10,  0, 'Herramienta eléctrica para el cuarto trimestre',
    [['HER-0402', 6], ['HER-0403', 15]]);

  guardarBD();
}

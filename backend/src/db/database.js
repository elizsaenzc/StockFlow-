import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const RUTA_BD = join(__dir, '../../stockflow.db.bin');

let _bd = null;

export async function iniciarBD() {
  const SQL = await initSqlJs();
  _bd = existsSync(RUTA_BD)
    ? new SQL.Database(readFileSync(RUTA_BD))
    : new SQL.Database();
  crearEsquema();
  return _bd;
}

export function getBD() {
  if (!_bd) throw new Error('Base de datos no iniciada — llama a iniciarBD() primero');
  return _bd;
}

export function guardarBD() {
  if (!_bd) return;
  writeFileSync(RUTA_BD, Buffer.from(_bd.export()));
}

/** Ejecuta una sentencia y devuelve { ultimoId, cambios } */
export function ejecutar(sql, params = []) {
  const seguros = params.map(v => (v === undefined ? null : v));
  getBD().run(sql, seguros);
  const stmt = getBD().prepare('SELECT last_insert_rowid() as id, changes() as ch');
  stmt.step();
  const fila = stmt.getAsObject();
  stmt.free();
  return { ultimoId: fila.id, cambios: fila.ch };
}

/** Devuelve todas las filas como objetos planos */
export function consultar(sql, params = []) {
  const seguros = (params ?? []).map(v => (v === undefined ? null : v));
  const stmt = getBD().prepare(sql);
  stmt.bind(seguros);
  const filas = [];
  while (stmt.step()) filas.push(stmt.getAsObject());
  stmt.free();
  return filas;
}

/** Devuelve la primera fila o null */
export function consultarUno(sql, params = []) {
  return consultar(sql, params)[0] ?? null;
}

// Alias cortos usados internamente
export const run   = ejecutar;
export const all   = consultar;
export const first = consultarUno;

function crearEsquema() {
  getBD().run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_usuario   TEXT NOT NULL UNIQUE,
      contrasena       TEXT NOT NULL,
      rol              TEXT NOT NULL DEFAULT 'operario',
      nombre_completo  TEXT,
      correo           TEXT,
      fecha_alta       TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS almacenes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre       TEXT NOT NULL UNIQUE,
      direccion    TEXT,
      ciudad       TEXT,
      responsable  TEXT,
      activo       INTEGER DEFAULT 1,
      fecha_alta   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS familias (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL UNIQUE,
      color      TEXT DEFAULT '#6C7FFF',
      fecha_alta TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS proveedores (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre           TEXT NOT NULL,
      contacto         TEXT,
      correo           TEXT,
      telefono         TEXT,
      direccion        TEXT,
      pais             TEXT DEFAULT 'España',
      plazo_entrega    INTEGER DEFAULT 7,
      condiciones_pago TEXT,
      notas            TEXT,
      puntuacion       REAL DEFAULT 5.0,
      activo           INTEGER DEFAULT 1,
      fecha_alta       TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS articulos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      referencia    TEXT NOT NULL UNIQUE,
      cod_barras    TEXT UNIQUE,
      nombre        TEXT NOT NULL,
      descripcion   TEXT,
      familia_id    INTEGER REFERENCES familias(id),
      proveedor_id  INTEGER REFERENCES proveedores(id),
      unidad        TEXT DEFAULT 'ud',
      stock         REAL DEFAULT 0,
      stock_minimo  REAL DEFAULT 0,
      stock_maximo  REAL,
      punto_reorden REAL,
      cant_reorden  REAL,
      precio_coste  REAL DEFAULT 0,
      precio_venta  REAL DEFAULT 0,
      almacen_id    INTEGER REFERENCES almacenes(id),
      ubicacion     TEXT,
      activo        INTEGER DEFAULT 1,
      fecha_alta    TEXT DEFAULT (datetime('now')),
      fecha_mod     TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS movimientos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      articulo_id   INTEGER NOT NULL REFERENCES articulos(id),
      almacen_id    INTEGER REFERENCES almacenes(id),
      tipo          TEXT NOT NULL CHECK(tipo IN ('entrada','salida','ajuste','transferencia')),
      cantidad      REAL NOT NULL,
      stock_antes   REAL NOT NULL,
      stock_despues REAL NOT NULL,
      motivo        TEXT,
      referencia    TEXT,
      pedido_id     INTEGER,
      usuario_id    INTEGER REFERENCES usuarios(id),
      fecha         TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pedidos_compra (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_pedido  TEXT NOT NULL UNIQUE,
      proveedor_id   INTEGER NOT NULL REFERENCES proveedores(id),
      almacen_id     INTEGER REFERENCES almacenes(id),
      estado         TEXT DEFAULT 'borrador',
      fecha_esperada TEXT,
      fecha_recepcion TEXT,
      importe_total  REAL DEFAULT 0,
      notas          TEXT,
      creado_por     INTEGER REFERENCES usuarios(id),
      fecha_alta     TEXT DEFAULT (datetime('now')),
      fecha_mod      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS lineas_pedido (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id        INTEGER NOT NULL REFERENCES pedidos_compra(id),
      articulo_id      INTEGER NOT NULL REFERENCES articulos(id),
      cantidad_pedida  REAL NOT NULL,
      cantidad_recibida REAL DEFAULT 0,
      precio_unitario  REAL NOT NULL,
      fecha_alta       TEXT DEFAULT (datetime('now'))
    );
  `);
}

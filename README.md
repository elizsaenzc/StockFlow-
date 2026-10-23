# StockFlow-
Full-stack inventory management app built with Angular 17 (standalone components, signals, reactive forms, Angular Material) and a Node.js REST API with SQLite. Role-based access (administrator, purchasing manager, warehouse operator, read-only consultant), product catalog, stock movements, low-stock alerts, purchase orders and analytics. Live demo: https://stockflow-7zec.onrender.com


# StockFlow App— Sistema de Gestión de Almacén - Proyecto Angular Master Desarrollo Fullstack & Arquitectura Cloud - ELizabeth Sáenz 

**Stack:** Angular 17.3 (standalone + signals) · Angular Material + CDK · Chart.js (ng2-charts) · Node.js / Express · SQLite (sql.js) · JWT

[![CI](https://github.com/elizsaenzc/StockFlow-/actions/workflows/ci.yml/badge.svg)](https://github.com/elizsaenzc/StockFlow-/actions/workflows/ci.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/elizsaenzc/StockFlow-)

**Demo completa en vivo (Angular + API Node.js):** https://stockflow-7zec.onrender.com — usuario `admin` / `admin123`  
_Plan gratuito: la primera carga tras un rato sin uso puede tardar ~1 minuto._

## Interfaz

- **Angular Material**: `mat-sidenav` adaptable (menú lateral fijo en escritorio, desplegable en móvil), `mat-toolbar`, `mat-table` con ordenación y paginación, formularios reactivos con validación, diálogos (`MatDialog`), avisos (`MatSnackBar`), selector de fechas en español e iconos **Material Symbols** servidos desde el propio paquete (sin dependencias externas).
- **Gráficas** con Chart.js: entradas y salidas de los últimos 30 días, valor de stock por familia y actividad diaria a 90 días.
- Formato español de fechas, números e importes (`registerLocaleData` + `LOCALE_ID`).

## Roles y permisos

Se aplican en la API (`requerirRol`) y la interfaz oculta lo que cada rol no puede hacer:

| Acción | Administrador | Responsable de compras | Operario | Consultor |
|---|:-:|:-:|:-:|:-:|
| Consultar catálogo, movimientos, pedidos y analíticas | ✓ | ✓ | ✓ | ✓ |
| Registrar entradas, salidas, ajustes y recepciones | ✓ | ✓ | ✓ | |
| Crear y editar artículos, proveedores y pedidos | ✓ | ✓ | | |
| Dar de baja artículos y cancelar pedidos | ✓ | ✓ | | |

Además: un ajuste de inventario fija el recuento físico, no se puede recibir más de lo pedido, no se puede sacar más stock del disponible y las referencias de artículo son únicas. El historial de movimientos cuadra siempre con el stock (lo comprueba el CI).

## Despliegue completo (Angular + API Node.js + SQLite)

Un único contenedor: la API Express sirve el frontend Angular compilado y la API REST en `/api`.

```bash
docker build -t stockflow .
docker run -p 8080:8080 -e JWT_SECRET="una-clave-larga" stockflow
# http://localhost:8080  → usuario admin / admin123
```

En Render: **New → Blueprint** sobre este repositorio (usa `render.yaml`; `JWT_SECRET` se genera automáticamente). La base de datos se crea y se rellena con datos de ejemplo al arrancar.

| Variable | Uso | Por defecto |
|---|---|---|
| `JWT_SECRET` | Clave de firma de los tokens | valor de desarrollo |
| `STOCKFLOW_DB_PATH` | Fichero de la base SQLite | `/app/data/stockflow.db.bin` en Docker |
| `CORS_ORIGINS` | Orígenes permitidos si el frontend se aloja aparte | `localhost:4200,4201` |
| `PORT` | Puerto HTTP | `8080` en Docker, `3000` en local |

El pipeline de CI compila el frontend, construye la imagen, la arranca y ejecuta una auditoría de la API con los cuatro roles (`.github/scripts/api_audit.py`): permisos, validaciones y coherencia entre movimientos y stock.

Proyecto portfolio para **Distribuciones Iberia** — control de stock, movimientos,
proveedores y pedidos de compra para almacenes de suministros industriales en España.

---

## Contenido Solución 

### 1. Backend

```bash
cd backend
npm install
npm start
# Servidor en http://localhost:3000/api
# La base de datos se crea y rellena automáticamente al arrancar
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# Aplicación en http://localhost:4200
```


### Recomendado para ejecutar
cd backend
npm install
npm start
En otra terminal: cd frontend
npm install
npm start

---

## Accesos de prueba

| Usuario    | Contraseña   | Rol                 | Acceso                         |
|------------|-------------|---------------------|-------------------------------- |
| admin      | admin123    | Administrador       | Completo                       |
| compras    | compras123  | Resp. de Compras    | Pedidos, proveedores, artículos |
| almacen    | almacen123  | Operario de Almacén | Movimientos, consulta        |
| consultor  | visor123    | Consultor externo   | Solo lectura                |

---

## Datos de demostración incluidos

- **35 artículos** reales de suministros industriales (ferretería, material eléctrico,
  fontanería, herramientas, EPI, oficina, limpieza, pintura) con referencias, código
  de barras EAN-13, precios, ubicaciones y puntos de reorden
- **6 proveedores** españoles con contacto, condiciones de pago y scoring de rendimiento
- **4 almacenes** en Alcalá de Henares, Getafe, Mollet del Vallès y Vitoria-Gasteiz
- **8 familias** de artículos con código de color
- **6 pedidos de compra** en distintos estados (borrador, enviado, parcial, recibido)
- **180+ movimientos** históricos de los últimos 45 días

---

## Módulos de la aplicación

| Módulo           | URL           | Descripción                                                 |
|------------------|---------------|-------------------------------------------------------------|
| Panel de control | /panel        | KPIs, gráfica 30 días, stock crítico, artículos más movidos |
| Artículos        | /articulos    | Catálogo completo con filtros, CRUD, movimientos rápidos  |
| Movimientos      | /movimientos  | Historial completo de entradas, salidas y ajustes        |
| Alertas de stock | /alertas      | Artículos sin stock o bajo mínimo, reposición rápida      |
| Proveedores      | /proveedores  | Gestión de proveedores con scoring y detalle de historial   |
| Pedidos de compra| /pedidos      | Crear, enviar, recibir (parcial/total) y cancelar pedidos   |
| Analíticas       | /analiticas   | Rotación, valor por familia, rendimiento proveedores      |

---

## API REST

```
POST   /api/sesion

GET    /api/panel
GET    /api/analiticas

GET    /api/articulos          ?q=&familia=&proveedor=&almacen=&estado_stock=&page=&pageSize=
GET    /api/articulos/:id
POST   /api/articulos
PUT    /api/articulos/:id
DELETE /api/articulos/:id

GET    /api/familias
GET    /api/almacenes
GET    /api/proveedores
GET    /api/proveedores/:id
POST   /api/proveedores
PUT    /api/proveedores/:id

GET    /api/movimientos        ?tipo=&desde=&hasta=&articulo_id=
POST   /api/movimientos

GET    /api/pedidos            ?estado=
POST   /api/pedidos
PATCH  /api/pedidos/:id/recibir
PATCH  /api/pedidos/:id/cancelar
```

---

Desarrollado como proyecto de portfolio - ESC Media & Tech S.L. - Elizabeth Sáenz 

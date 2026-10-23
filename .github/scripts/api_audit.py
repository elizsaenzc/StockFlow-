"""Auditoría de la API de StockFlow contra el contenedor en marcha.

Inicia sesión con cada rol, recorre los endpoints de lectura y comprueba permisos,
coherencia de datos y validaciones. Sale con código 1 si algo falla.
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "http://localhost:8080")
USERS = {
    "administrador": ("admin", "admin123"),
    "responsable": ("compras", "compras123"),
    "operario": ("almacen", "almacen123"),
    "consultor": ("consultor", "visor123"),
}
lines, failures = [], []


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, raw[:200]


def check(cond, msg):
    lines.append(("OK   " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


tokens = {}
for role, (user, pwd) in USERS.items():
    status, body = call("POST", "/api/sesion", body={"nombre_usuario": user, "contrasena": pwd})
    check(status == 200 and body["usuario"]["rol"] == role, f"login {role} -> {status}")
    tokens[role] = body["token"]

status, _ = call("POST", "/api/sesion", body={"nombre_usuario": "admin", "contrasena": "mala"})
check(status == 401, f"login con contraseña incorrecta -> {status}")
status, _ = call("GET", "/api/panel")
check(status == 401, f"panel sin token -> {status}")

GETS = ["/api/panel", "/api/analiticas", "/api/articulos", "/api/articulos?page=1&pageSize=10",
        "/api/articulos?estado_stock=bajo", "/api/articulos/1", "/api/familias", "/api/almacenes",
        "/api/proveedores", "/api/proveedores/1", "/api/movimientos", "/api/pedidos"]
for role, token in tokens.items():
    for path in GETS:
        status, _ = call("GET", path, token)
        check(status == 200, f"{role:<13} GET {path} -> {status}")

admin = tokens["administrador"]
_, panel = call("GET", "/api/panel", admin)
k = panel["kpis"]
check(k["totalArticulos"] >= 50, f"panel: catálogo completo ({k['totalArticulos']} artículos)")
check(k["stockBajo"] + k["sinStock"] >= 4, f"panel: hay artículos en alerta ({k['stockBajo']} bajo, {k['sinStock']} sin stock)")
check(k["valorCoste"] > 0 and k["totalProveedores"] == 8, "panel: valor de almacén y proveedores")
check(len(panel["graficaMovimientos"]) >= 20, "panel: gráfica con actividad reciente")
check(all("nombre" in m for m in panel["masMovidos"]), "panel: más movidos con nombre")
check(all(m["fecha"].endswith("Z") for m in panel["movimientosRecientes"]), "fechas en ISO UTC")

# El historial cuadra con el stock actual de cada artículo
_, arts = call("GET", "/api/articulos", admin)
_, movs = call("GET", "/api/movimientos?limite=1000", admin)
ultimo = {}
for m in sorted(movs, key=lambda m: (m["fecha"], m["id"])):
    ultimo[m["articulo_id"]] = m["stock_despues"]
descuadres = [a["referencia"] for a in arts if a["id"] in ultimo and ultimo[a["id"]] != a["stock"]]
check(not descuadres, f"historial coherente con el stock ({len(descuadres)} descuadres)")
cadena = {}
rotos = 0
for m in sorted(movs, key=lambda m: (m["fecha"], m["id"])):
    if m["articulo_id"] in cadena and cadena[m["articulo_id"]] != m["stock_antes"]:
        rotos += 1
    cadena[m["articulo_id"]] = m["stock_despues"]
check(rotos == 0, f"cada movimiento parte del stock del anterior ({rotos} saltos)")

_, provs = call("GET", "/api/proveedores", admin)
reales = {}
for a in arts:
    reales[a["proveedor_id"]] = reales.get(a["proveedor_id"], 0) + 1
check(all(p["total_articulos"] == reales.get(p["id"], 0) for p in provs), "proveedores: nº de artículos correcto")

# Permisos por rol
consultor, operario = tokens["consultor"], tokens["operario"]
nuevo = {"referencia": "AUD-001", "nombre": "Artículo de auditoría", "stock": 5, "stock_minimo": 1, "precio_coste": 1, "precio_venta": 2}
check(call("POST", "/api/articulos", consultor, nuevo)[0] == 403, "consultor no crea artículos")
check(call("PUT", "/api/articulos/1", consultor, {"nombre": "x"})[0] == 403, "consultor no edita artículos")
check(call("POST", "/api/movimientos", consultor, {"articulo_id": 1, "tipo": "entrada", "cantidad": 1})[0] == 403, "consultor no mueve stock")
check(call("PATCH", "/api/pedidos/4/recibir", consultor, {"lineas": []})[0] == 403, "consultor no recibe pedidos")
check(call("POST", "/api/articulos", operario, nuevo)[0] == 403, "operario no crea artículos")
check(call("DELETE", "/api/articulos/1", operario)[0] == 403, "operario no da de baja artículos")

# Validaciones y lógica de stock
status, creado = call("POST", "/api/articulos", admin, nuevo)
check(status == 201, f"admin crea artículo ({status})")
check(call("POST", "/api/articulos", admin, nuevo)[0] == 409, "referencia duplicada rechazada")
aid = creado["id"]
status, m = call("POST", "/api/movimientos", operario, {"articulo_id": aid, "tipo": "entrada", "cantidad": "3"})
check(status == 201 and m["stock_despues"] == 8, f"entrada con cantidad en texto suma bien ({m.get('stock_despues') if isinstance(m, dict) else m})")
status, _ = call("POST", "/api/movimientos", operario, {"articulo_id": aid, "tipo": "salida", "cantidad": 99})
check(status == 422, f"salida mayor que el stock rechazada ({status})")
status, m = call("POST", "/api/movimientos", operario, {"articulo_id": aid, "tipo": "ajuste", "cantidad": 6})
check(status == 201 and m["stock_despues"] == 6 and m["cantidad"] == 2, "ajuste fija el recuento físico")
check(call("POST", "/api/movimientos", operario, {"articulo_id": aid, "tipo": "salida", "cantidad": -1})[0] == 400, "cantidad negativa rechazada")

_, pedidos = call("GET", "/api/pedidos?estado=enviado", admin)
pc = pedidos[0]
linea = pc["lineas"][0]
status, rec = call("PATCH", f"/api/pedidos/{pc['id']}/recibir", operario,
                   {"lineas": [{"linea_id": linea["id"], "cantidad_recibida": linea["cantidad_pedida"] + 50}]})
recibida = next(l for l in rec["lineas"] if l["id"] == linea["id"])["cantidad_recibida"]
check(status == 200 and recibida == linea["cantidad_pedida"], f"no se recibe más de lo pedido ({recibida}/{linea['cantidad_pedida']})")
check(call("POST", "/api/pedidos", admin, {"proveedor_id": 1, "lineas": [{"articulo_id": 1, "cantidad": 0, "precio_unitario": 1}]})[0] == 400,
      "pedido con línea vacía rechazado")
# Envío de borradores al proveedor
_, borradores = call("GET", "/api/pedidos?estado=borrador", admin)
check(len(borradores) >= 1, "hay pedidos en borrador")
bid = borradores[0]["id"]
check(call("PATCH", f"/api/pedidos/{bid}/enviar", operario)[0] == 403, "operario no envía pedidos")
status, env = call("PATCH", f"/api/pedidos/{bid}/enviar", admin)
check(status == 200 and env["estado"] == "enviado", f"admin envía el borrador ({status})")
check(call("PATCH", f"/api/pedidos/{bid}/enviar", admin)[0] == 400, "no se reenvía un pedido ya enviado")

# Ficha de artículo con historial completo y pedidos abiertos
mas_movido = max(arts, key=lambda a: sum(1 for m in movs if m["articulo_id"] == a["id"]))
_, ficha = call("GET", f"/api/articulos/{mas_movido['id']}", admin)
_, suyos = call("GET", f"/api/movimientos?articulo_id={mas_movido['id']}&limite=1000", admin)
check(len(ficha["movimientos"]) == len(suyos) > 0 and "pedidosAbiertos" in ficha,
      f"ficha con historial completo ({len(ficha['movimientos'])} de {len(suyos)} movimientos)")
_, refs = call("GET", "/api/articulos", admin)
eans = [a["cod_barras"] for a in refs if a.get("cod_barras") and len(a["cod_barras"]) == 13]
def ean_ok(c):
    return (10 - sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(c[:12])) % 10) % 10 == int(c[12])
check(eans and all(ean_ok(c) for c in eans), f"códigos EAN-13 válidos ({len(eans)})")

status, _ = call("POST", "/api/sesion", body=None)
check(status == 400, f"login sin cuerpo -> {status}")

report = "\n".join(lines)
print(report)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
        f.write("## Auditoría de la API\n\n```\n" + report + "\n```\n")
for msg in failures:
    print(f"::error title=Auditoría API::{msg}")
sys.exit(1 if failures else 0)

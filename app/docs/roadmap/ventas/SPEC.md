# Ventas — documento de diseño

> **ESTADO: esquema y API (backend) creados; sin UI.** Este documento recoge las decisiones de diseño tomadas por el usuario. Existen las tablas, los modelos Sequelize (migración 004) y los endpoints de ventas; no hay vistas ni reportes de ventas.

## Decisiones

1. **Roles**: no es un rol nuevo. Lo usan Empleado y Administrador. El Empleado ve precios.
2. **Estructura de la venta**: una venta tiene varias líneas (libro + cantidad). Una sola bodega por venta (la única existente, preseleccionada).
3. **Datos que guarda**: precio unitario por línea (snapshot), total, vendedor y fecha; método de pago (efectivo o transferencia); cliente (nombre/NIT, "Consumidor final" por defecto); descuento (lo pueden aplicar ambos roles); notas.
4. **Libros sin precio**: se bloquea vender libros con `precio = 0`.
5. **Documento y transacción**: la venta es un documento (`ventas` + `venta_detalles`) que genera movimientos de Salida en UNA sola transacción. El trigger descuenta el stock y el kardex sigue siendo la fuente de verdad.
6. **Movimientos**: NO crear tipos nuevos en `tipo_movimientos` (el trigger lanza excepción con tipos desconocidos). Se reutilizan Salida/Ingreso con una FK nullable `venta_id` en `movimientos_inventario` (migración) y `motivo_detalle` ("Venta V-000123").
7. **Anulación**: las ventas se anulan, no se borran. Solo el Administrador anula. La anulación genera movimientos de Ingreso inversos.
8. **Correlativo**: simple (V-000123); puede tener huecos.
9. **Concurrencia**: bloquear los `inventarios` en orden fijo (por id) para evitar deadlocks, y pre-validar el stock con `FOR UPDATE` para responder 409 con el título del libro (el trigger solo da un 400 genérico).
10. **Facturación electrónica**: fuera de alcance, pero con la puerta abierta (NIT/cliente).
11. **Reportes de ventas**: subtarea posterior. El modelo debe dejarlos viables (índices por fecha y estado).
12. **Prerrequisito (cumplido)**: poder fijar el precio de un libro ya registrado. Lo que registra un Empleado queda en precio 0; el Administrador lo fija con `PATCH /api/libros/:id/precio` (botón en la ficha del libro). Una venta debe rechazar libros con precio 0.
13. **Orden previsto**: migración 004 + `schema.sql` + modelos Sequelize; backend transaccional (riesgo alto); frontend de ventas; reportes.

## Modelo de datos implementado (migración 004)

Fuente de verdad: `database/schema.sql` (la migración `004_ventas.sql` lleva el mismo DDL).
- `ventas` + `venta_detalles`; una línea por libro por venta (`uq_venta_libro`).
- `descuento` es un monto fijo sobre el subtotal; `total = subtotal - descuento` lo exige la BD.
- `precio_unitario` es un snapshot del precio al vender y debe ser mayor que 0.
- `metodo_pago` y `estado` se validan con CHECK (sin tablas ni enums); la anulación exige `anulada_en` y `anulada_por`.
- `numero` sale de la secuencia `ventas_numero_seq`: único, creciente y con posibles huecos.
- Todas las FK son `RESTRICT` (libro, usuario, bodega, movimientos); solo los detalles caen en cascada con su venta.
- `movimientos_inventario.venta_id` es nullable; no hay tipos nuevos en `tipo_movimientos`.

## API implementada (backend)

Todas las respuestas usan `{ status: 'success', data }` o `{ status: 'fail', message }` (con `details` en errores de validación).

| Método y ruta | Roles | Respuesta |
|---|---|---|
| `POST /api/ventas` | Administrador, Empleado | 201 con el detalle de la venta |
| `GET /api/ventas?estado=&desde=&hasta=&limit=&offset=` | Administrador, Empleado (ven todas las ventas) | 200 `{ total, limit, offset, ventas: [...] }` |
| `GET /api/ventas/:id` | Administrador, Empleado | 200 con el detalle |
| `POST /api/ventas/:id/anular` | Solo Administrador | 200 con el detalle actualizado |

- **Crear** — body: `{ bodegaId, items: [{ libroId, cantidad }], metodoPago, clienteNombre?, clienteNit?, descuento?, notas? }`. `items` de 1 a 50 elementos sin libros repetidos; `cantidad` entero de 1 a 2147483647; `metodoPago` `Efectivo` o `Transferencia`; `clienteNombre` ≤ 150 (vacío → "Consumidor final"); `clienteNit` ≤ 20 (vacío → `null`); `descuento` monto fijo en quetzales con máximo 2 decimales; `notas` ≤ 1000. Se ignoran `precio`, `subtotal`, `total` y `usuarioId` del body: el precio sale de `libros.precio` leído dentro de la transacción (snapshot en el detalle) y el vendedor es `req.user.id`.
- **Anular** — body: `{ motivo }` (obligatorio, ≤ 500). Anulación total: un `Ingreso` por línea con `venta_id` y el estado pasa a `Anulada` con `anulada_en`, `anulada_por` y `motivo_anulacion`.
- **Detalle**: `{ id, numero, codigo, fecha, estado, bodega:{id,nombre}, vendedor:{id,nombre_completo}, cliente_nombre, cliente_nit, metodo_pago, subtotal, descuento, total, notas, anulada_en, anulada_por:{id,nombre_completo}|null, motivo_anulacion, detalles:[{ libro_id, titulo, isbn, cantidad, precio_unitario, subtotal }] }`. `codigo` es "V-" + `numero` con 6 dígitos (`V-000123`); `fecha` es `creado_en`; los importes son cadenas con 2 decimales.
- **Ítem de listado**: `{ id, numero, codigo, fecha, estado, cliente_nombre, metodo_pago, subtotal, descuento, total, vendedor_nombre, bodega_nombre, lineas, unidades }`, ordenado por fecha descendente (`limit` 1 a 200, 50 por defecto; `offset` ≥ 0).
- **Códigos de error**: 400 validación (campos, descuento mayor que el subtotal, subtotal o total sobre `99999999.99`, fechas inexistentes o `desde > hasta`); 401 sin token; 403 rol sin permiso (Empleado al anular; rol Usuario en todo); 404 libro, bodega (inexistente o inactiva) o venta inexistente; 409 libro con `precio <= 0`, stock insuficiente (`Stock insuficiente: «Título» (disponible 2, solicitado 3); ...`, con todos los libros afectados; un libro sin inventario en la bodega cuenta como stock 0) o venta ya anulada.
- **Dinero**: todo el cálculo es en centavos enteros (`utils/ventas.js`); nunca punto flotante. El subtotal máximo es 99999999.99 (NUMERIC(10,2)); excederlo es un 400, no un 500.
- **Concurrencia**: una sola transacción por operación; los inventarios de las líneas se bloquean con `FOR UPDATE` en orden ascendente de `id` (crear y anular) y el stock se valida con lo leído bajo el bloqueo. La anulación bloquea además la fila de la venta.
- **Zona horaria**: `desde` y `hasta` son días `YYYY-MM-DD` inclusivos en hora de Guatemala, con desplazamiento fijo -06:00 (Guatemala no usa horario de verano): `creado_en >= desdeT00:00:00-06:00` y `creado_en < (hasta + 1 día)T00:00:00-06:00`. Se rechazan fechas inexistentes (2026-02-30) y `desde > hasta`.

### Decisiones pendientes
- **Libros inactivos**: hoy se pueden vender (no se bloquean). Decidir si una venta debe rechazar `libros.activo = false`.
- **Visibilidad por rol**: hoy Empleado y Administrador ven todas las ventas. Decidir si el Empleado debe ver solo las suyas.

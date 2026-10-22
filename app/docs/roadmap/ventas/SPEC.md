# Ventas — documento de diseño

> **ESTADO: esquema y modelos creados; sin API ni UI.** Este documento recoge las decisiones de diseño tomadas por el usuario. Existen las tablas y los modelos Sequelize (migración 004); no hay endpoints, servicios ni vistas de ventas.

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

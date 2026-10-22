# Ventas — documento de diseño

> **ESTADO: NO IMPLEMENTADO (roadmap).** Este documento recoge las decisiones de diseño tomadas por el usuario. No existen tablas, modelos, endpoints ni vistas de ventas en el código.

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
12. **Prerrequisito**: poder fijar el precio de un libro ya registrado. Hoy lo que registra un Empleado queda en precio 0 y no se podría vender; ver roadmap `catalog-employee-crud`.
13. **Orden previsto**: migración 004 + `schema.sql` + modelos Sequelize; backend transaccional (riesgo alto); frontend de ventas; reportes.

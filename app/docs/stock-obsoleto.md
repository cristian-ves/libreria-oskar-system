# Reporte administrativo de stock obsoleto

## Consulta

`GET /api/reportes/stock-obsoleto` es exclusivo de Administrador y devuelve una página por combinación de inventario/libro/bodega. Parámetros:

- `diasSinVenta`: 1–3650; predeterminado 180.
- `q`: hasta 120 caracteres, busca en título e ISBN.
- `categoriaId`, `bodegaId`, `sucursalId`: UUID.
- `libroActivo`: `activo` (predeterminado), `inactivo` o `todos`.
- `limit`: 1–200 (predeterminado 50), `offset`: entero no negativo.

La respuesta sigue el sobre `{ status: 'success', data }` y contiene `registros`, `total`, filtros, página, resumen de existencias y descripción del criterio. `GET /api/reportes/stock-obsoleto/opciones` proporciona sucursales activas con bodegas activas para el filtro.

## Criterio de rotación

Se incluye inventario con existencias positivas en bodega y sucursal activas cuando la última venta comercial completada de ese libro en esa misma bodega tiene al menos el período configurado. Se excluyen ventas anuladas. Si no hay ventas completadas, se usa el primer movimiento `Ingreso` con `venta_id IS NULL`; si no hay ese dato, se usa `inventarios.creado_en`. La diferencia de días se calcula con el calendario de `America/Guatemala`.

El historial anterior al módulo de ventas puede no contener todos los ingresos iniciales; por eso la fecha de creación del inventario es un fallback, no una fecha comercial garantizada. Los movimientos de reposición de anulaciones llevan `venta_id` y no se tratan como primera recepción. Los ajustes, pérdidas y salidas administrativas no cuentan como venta.

`GET /api/inventario?estado=obsoleto` y el KPI de inventario mantienen su contrato y la semántica previa de “sin movimientos de Salida”; el nuevo reporte mide ventas comerciales. Sus cantidades pueden diferir legítimamente y las interfaces etiquetan ambos criterios.

## Índices

La migración `022_gestion_stock_obsoleto.sql` agrega índices idempotentes para `(ventas.bodega_id, estado, creado_en DESC)`, `(venta_detalles.libro_id, venta_id)` y movimientos `(inventario_id, fecha_movimiento)` con `venta_id IS NULL`. El reporte hace agregados laterales en una consulta analítica parametrizada y pagina en PostgreSQL. La exportación reutiliza el servicio JSON y recoge todas las páginas filtradas; admite hasta 5,000 filas y devuelve HTTP 413 al superar ese máximo. No exporta solo la página visible.

## Acciones correctivas

- Cambio de precio reutiliza `PATCH /api/libros/:id/precio`. El precio es global por libro y afecta la comercialización de todas las bodegas/sucursales; las líneas históricas conservan su snapshot.
- Baja justificada reutiliza `POST /api/inventario/:id/salida`, con cantidad disponible y motivo obligatorio en la interfaz. El backend registra el movimiento y el trigger actualiza stock; el Kardex permanece intacto. La ruta existente permite Administrador y Empleado para el trabajo normal de inventario; el módulo de reportes y su interfaz quedan protegidos para Administrador.
- Devoluciones a proveedor no implementadas: no hay modelo de proveedores/compras adecuado. No simularlas con ventas.
- No se calcula capital inmovilizado: precio de venta no equivale a costo de adquisición.

## Notificaciones periódicas

No se envía correo mensual en esta entrega. Para automatizarlo se requiere un Job separado que reutilice la consulta y el generador del reporte, destinatarios/configuración de periodicidad aprobados, pruebas de idempotencia y manejo de fallos, más la coordinación de Alejandro para IAM, Cloud Run Job y Cloud Scheduler. No modificar ni reutilizar como ejecutor el Job `oskar-alertas-inventario`.

## Prueba manual

En la vista `/reportes`, elegir **Stock obsoleto**. Aplicar los filtros de texto, categoría, sucursal/bodega, estado y período; comprobar paginación y descargar ambos formatos. En un registro, probar un precio válido y una baja con motivo. Confirmar que se advierte el alcance global del precio, que una venta histórica conserva su importe, que la salida requiere confirmación y que el Kardex registra el motivo. Empleado, Usuario y visitantes no deben acceder a `/reportes`.

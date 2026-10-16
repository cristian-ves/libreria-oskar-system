---
name: inventory-transactions
description: Preservar integridad de stock, triggers PL/pgSQL y transacciones al modificar libros e inventario.
---

# Inventario: transacciones, triggers y concurrencia

## Invariantes no negociables
- Un movimiento en `movimientos_inventario` dispara `tg_movimientos_inventario_stock` y `fn_actualizar_stock_por_movimiento()`.
- El trigger es el único responsable de modificar `inventarios.stock_actual`, excepto valor inicial 0 en la creación. No duplicar updates en JS/Sequelize.
- Movimientos y stock deben confirmar o revertirse juntos. Todas las operaciones del flujo comparten una conexión y transacción.
- Salidas no pueden resultar en stock negativo. Los ajustes representan el valor final de inventario, no un delta.
- Una bodega puede tener múltiples inventarios (uno por libro). `UNIQUE (libro_id,bodega_id)` impide duplicados.

## Procedimiento
1. Inspeccionar `libro.service.js`, `inventario.service.js`, repositorios dependientes, trigger y tests aplicables.
2. Mapear altas/lecturas/movimientos bajo `db.withTransaction` antes de convertir a `sequelize.transaction(async transaction => ...)`.
3. En salidas/ajustes utilizar bloqueo de fila en la misma transacción: `Inventario.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })`.
4. Insertar movimiento, dejar actuar al trigger y releer stock dentro de la transacción. Proteger contra errores de concurrencia y constraints.
5. Probar: ingreso único, rollback tras movimiento, dos salidas del último ejemplar, dos escaneos del mismo ISBN y dos altas del mismo inventario.
6. Nunca eliminar triggers ni atenuar reglas de integridad para pasar las pruebas.

## Alertas
- Bajo stock: `stock_actual <= stock_minimo`.
- Stock muerto: existencias > 0 y sin salidas durante ventana configurable; si nunca tuvo salida, usar `inventarios.creado_en`. No confundir “salida” con venta.

// Fragmentos SQL compartidos por el listado y el resumen.
// Subconsulta: fecha de la última salida del inventario actual.
const ULTIMA_SALIDA_SQL = `(
      SELECT MAX(m.fecha_movimiento)
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      WHERE m.inventario_id = "Inventario"."id" AND LOWER(tm.nombre) = 'salida'
    )`;

module.exports = { ULTIMA_SALIDA_SQL };

const db = require('../config/db');

class MovimientoRepository {
  /**
   * Obtiene el identificador y detalle de un tipo de movimiento por nombre.
   * @param {string} nombre - 'Ingreso', 'Salida', 'Ajuste'
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async getTipoMovimientoByName(nombre, executor = db.pool) {
    const text = `
      SELECT id, nombre, descripcion
      FROM tipo_movimientos
      WHERE LOWER(nombre) = LOWER($1)
      LIMIT 1;
    `;
    const res = await executor.query(text, [nombre.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Asegura la existencia de un tipo de movimiento ('Ingreso', 'Salida', etc.).
   * @param {string} nombre
   * @param {string} descripcion
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async ensureTipoMovimiento(nombre, descripcion = '', executor = db.pool) {
    const text = `
      INSERT INTO tipo_movimientos (nombre, descripcion)
      VALUES ($1, $2)
      ON CONFLICT (nombre) DO UPDATE
        SET nombre = EXCLUDED.nombre
      RETURNING id, nombre, descripcion;
    `;
    const res = await executor.query(text, [nombre.trim(), descripcion]);
    return res.rows[0];
  }

  /**
   * Inserta un nuevo registro de movimiento de inventario dentro de una transacción.
   * Dispara automáticamente el trigger PL/pgSQL 'tg_movimientos_inventario_stock'
   * que actualiza de forma atómica y pesimista el stock en la tabla inventarios.
   * 
   * @param {import('pg').PoolClient} executor
   * @param {{
   *   inventarioId: string,
   *   usuarioId: string,
   *   tipoMovimientoId: string,
   *   cantidad: number,
   *   motivoDetalle?: string
   * }} data
   */
  async createMovimiento(executor, { inventarioId, usuarioId, tipoMovimientoId, cantidad, motivoDetalle = null }) {
    const text = `
      INSERT INTO movimientos_inventario (
        inventario_id,
        usuario_id,
        tipo_movimiento_id,
        cantidad,
        motivo_detalle
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, inventario_id, usuario_id, tipo_movimiento_id, cantidad, motivo_detalle, fecha_movimiento;
    `;

    const values = [
      inventarioId,
      usuarioId,
      tipoMovimientoId,
      cantidad,
      motivoDetalle,
    ];

    const res = await executor.query(text, values);
    return res.rows[0];
  }
}

module.exports = new MovimientoRepository();

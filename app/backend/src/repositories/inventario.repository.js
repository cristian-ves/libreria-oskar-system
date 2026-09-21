const db = require('../config/db');

class InventarioRepository {
  /**
   * Busca el registro de inventario para un libro en una bodega específica.
   * @param {string} libroId
   * @param {string} bodegaId
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findByLibroAndBodega(libroId, bodegaId, executor = db.pool) {
    const text = `
      SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
      FROM inventarios
      WHERE libro_id = $1 AND bodega_id = $2
      LIMIT 1;
    `;
    const res = await executor.query(text, [libroId, bodegaId]);
    return res.rows[0] || null;
  }

  /**
   * Obtiene o crea el registro de inventario de forma atómica con ON CONFLICT.
   * Si no existe, inicializa con stock 0 (el stock real se incrementa por los movimientos).
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {string} libroId
   * @param {string} bodegaId
   * @param {number} [stockMinimo=5]
   */
  async findOrCreate(executor, libroId, bodegaId, stockMinimo = 5) {
    const text = `
      INSERT INTO inventarios (libro_id, bodega_id, stock_actual, stock_minimo)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (libro_id, bodega_id) DO UPDATE
        SET libro_id = EXCLUDED.libro_id
      RETURNING id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en;
    `;
    const res = await executor.query(text, [libroId, bodegaId, stockMinimo]);
    return res.rows[0];
  }

  /**
   * Consulta el estado actual de inventario por su ID.
   * @param {string} id
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findById(id, executor = db.pool) {
    const text = `
      SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
      FROM inventarios
      WHERE id = $1;
    `;
    const res = await executor.query(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Lista todos los registros de inventario de un libro por bodega,
   * incluyendo nombre de bodega y sucursal.
   * @param {string} libroId
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   * @returns {Promise<Array<{bodega_id, bodega_nombre, sucursal_nombre, stock_actual, stock_minimo}>>}
   */
  async findByLibroId(libroId, executor = db.pool) {
    const text = `
      SELECT
        inv.id,
        inv.bodega_id,
        b.nombre   AS bodega_nombre,
        s.nombre   AS sucursal_nombre,
        inv.stock_actual,
        inv.stock_minimo
      FROM inventarios inv
      JOIN bodegas b    ON b.id = inv.bodega_id
      LEFT JOIN sucursales s ON s.id = b.sucursal_id
      WHERE inv.libro_id = $1
      ORDER BY s.nombre, b.nombre;
    `;
    const res = await executor.query(text, [libroId]);
    return res.rows;
  }

  /**
   * Actualiza el stock_minimo de un inventario existente.
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {string} inventarioId
   * @param {number} stockMinimo
   */
  async setStockMinimo(executor, inventarioId, stockMinimo) {
    const text = `
      UPDATE inventarios
      SET stock_minimo = $2
      WHERE id = $1
      RETURNING id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en;
    `;
    const res = await executor.query(text, [inventarioId, stockMinimo]);
    return res.rows[0] || null;
  }
}

module.exports = new InventarioRepository();

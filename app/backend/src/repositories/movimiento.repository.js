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

  /**
   * Consulta el kardex / movimientos de inventario con filtros y paginación.
   * @param {{
   *   libroId?: string,
   *   bodegaId?: string,
   *   tipo?: string,
   *   limit?: number,
   *   offset?: number
   * }} filters
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findAllWithFilters({ libroId = null, bodegaId = null, tipo = null, limit = 50, offset = 0 }, executor = db.pool) {
    const params = [];
    const whereConditions = [];

    if (libroId && typeof libroId === 'string' && libroId.trim()) {
      params.push(libroId.trim());
      whereConditions.push(`inv.libro_id = $${params.length}`);
    }

    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      params.push(bodegaId.trim());
      whereConditions.push(`inv.bodega_id = $${params.length}`);
    }

    if (tipo && typeof tipo === 'string' && tipo.trim()) {
      params.push(tipo.trim());
      whereConditions.push(`LOWER(tm.nombre) = LOWER($${params.length})`);
    }

    let whereClause = '';
    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Consulta de total
    const countSql = `
      SELECT COUNT(*)::INTEGER AS total
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      JOIN inventarios inv ON inv.id = m.inventario_id
      ${whereClause}
    `;

    // Consulta de filas
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      SELECT
        m.id,
        m.fecha_movimiento,
        tm.nombre AS tipo,
        m.cantidad,
        m.motivo_detalle,
        l.id AS libro_id,
        l.titulo,
        l.isbn,
        b.nombre AS bodega_nombre,
        s.nombre AS sucursal_nombre,
        u.nombre_completo AS usuario_nombre
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      JOIN inventarios inv ON inv.id = m.inventario_id
      JOIN libros l ON l.id = inv.libro_id
      JOIN bodegas b ON b.id = inv.bodega_id
      LEFT JOIN sucursales s ON s.id = b.sucursal_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      ${whereClause}
      ORDER BY m.fecha_movimiento DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const countParams = params.slice(0, params.length - 2);
    const [countRes, dataRes] = await Promise.all([
      executor.query(countSql, countParams),
      executor.query(dataSql, params),
    ]);

    const total = countRes.rows[0]?.total || 0;

    return {
      total,
      limit,
      offset,
      movimientos: dataRes.rows,
    };
  }
}

module.exports = new MovimientoRepository();

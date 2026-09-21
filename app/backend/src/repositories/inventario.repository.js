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

  /**
   * Bloquea y consulta un registro de inventario con SELECT ... FOR UPDATE.
   * @param {string} id
   * @param {import('pg').PoolClient} executor
   */
  async findByIdForUpdate(id, executor) {
    const text = `
      SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
      FROM inventarios
      WHERE id = $1
      FOR UPDATE;
    `;
    const res = await executor.query(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Lista el inventario detallado por libro y bodega con métricas calculadas y filtros.
   * @param {{ estado?: string, q?: string, bodegaId?: string, diasStockObsoleto?: number }} params
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findAllWithDetails({ estado = 'todos', q = '', bodegaId = null, diasStockObsoleto = 90 }, executor = db.pool) {
    const params = [diasStockObsoleto];
    const whereConditions = [];

    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      params.push(bodegaId.trim());
      whereConditions.push(`inv.bodega_id = $${params.length}`);
    }

    if (q && typeof q === 'string' && q.trim()) {
      params.push(`%${q.trim()}%`);
      const qIdx = params.length;
      whereConditions.push(`(
        LOWER(l.titulo) LIKE LOWER($${qIdx})
        OR LOWER(COALESCE(a.nombre, '')) LIKE LOWER($${qIdx})
        OR l.isbn LIKE $${qIdx}
      )`);
    }

    if (estado === 'en_stock') {
      whereConditions.push('inv.stock_actual > inv.stock_minimo');
    } else if (estado === 'bajo_stock') {
      whereConditions.push('inv.stock_actual <= inv.stock_minimo');
    } else if (estado === 'obsoleto') {
      whereConditions.push(`(
        inv.stock_actual > 0 
        AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en) < (NOW() - ($1 || ' days')::INTERVAL)
      )`);
    }

    let text = `
      SELECT 
        inv.id AS inventario_id,
        inv.libro_id,
        l.titulo,
        l.isbn,
        l.imagen_url,
        a.nombre AS autor,
        c.nombre AS categoria,
        b.id AS bodega_id,
        b.nombre AS bodega_nombre,
        s.nombre AS sucursal_nombre,
        inv.stock_actual,
        inv.stock_minimo,
        ult_sal.fecha_movimiento AS ultima_salida,
        (inv.stock_actual <= inv.stock_minimo) AS bajo_stock,
        (inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en) < (NOW() - ($1 || ' days')::INTERVAL)) AS obsoleto
      FROM inventarios inv
      JOIN libros l ON l.id = inv.libro_id
      LEFT JOIN autores a ON a.id = l.autor_id
      LEFT JOIN categorias c ON c.id = l.categoria_id
      JOIN bodegas b ON b.id = inv.bodega_id
      LEFT JOIN sucursales s ON s.id = b.sucursal_id
      LEFT JOIN LATERAL (
        SELECT MAX(m.fecha_movimiento) AS fecha_movimiento
        FROM movimientos_inventario m
        JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
        WHERE m.inventario_id = inv.id AND LOWER(tm.nombre) = 'salida'
      ) ult_sal ON true
    `;

    if (whereConditions.length > 0) {
      text += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    text += `
      ORDER BY l.titulo ASC
      LIMIT 200;
    `;

    const res = await executor.query(text, params);
    return res.rows;
  }

  /**
   * Obtiene el resumen general del inventario, alertas y libros sin precio.
   * @param {number} diasStockObsoleto
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async getResumen(diasStockObsoleto = 90, executor = db.pool) {
    const textMetricas = `
      SELECT
        COALESCE(SUM(inv.stock_actual), 0)::INTEGER AS total_unidades,
        COUNT(DISTINCT CASE WHEN inv.stock_actual > 0 THEN inv.libro_id END)::INTEGER AS titulos_con_stock,
        COUNT(CASE WHEN inv.stock_actual <= inv.stock_minimo THEN 1 END)::INTEGER AS bajo_stock,
        COUNT(CASE WHEN inv.stock_actual = 0 THEN 1 END)::INTEGER AS agotados,
        COUNT(CASE WHEN inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en) < (NOW() - ($1 || ' days')::INTERVAL) THEN 1 END)::INTEGER AS obsoletos
      FROM inventarios inv
      LEFT JOIN LATERAL (
        SELECT MAX(m.fecha_movimiento) AS fecha_movimiento
        FROM movimientos_inventario m
        JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
        WHERE m.inventario_id = inv.id AND LOWER(tm.nombre) = 'salida'
      ) ult_sal ON true;
    `;

    const textSinPrecio = `
      SELECT COUNT(*)::INTEGER AS libros_sin_precio
      FROM libros
      WHERE activo = true AND (precio = 0 OR precio IS NULL);
    `;

    const textAlertas = `
      SELECT
        l.titulo,
        b.nombre AS bodega_nombre,
        inv.stock_actual,
        inv.stock_minimo
      FROM inventarios inv
      JOIN libros l ON l.id = inv.libro_id
      JOIN bodegas b ON b.id = inv.bodega_id
      WHERE inv.stock_actual <= inv.stock_minimo
      ORDER BY (inv.stock_actual - inv.stock_minimo) ASC
      LIMIT 10;
    `;

    const [resMetricas, resSinPrecio, resAlertas] = await Promise.all([
      executor.query(textMetricas, [diasStockObsoleto]),
      executor.query(textSinPrecio),
      executor.query(textAlertas),
    ]);

    const metricas = resMetricas.rows[0] || {
      total_unidades: 0,
      titulos_con_stock: 0,
      bajo_stock: 0,
      agotados: 0,
      obsoletos: 0,
    };

    const librosSinPrecio = resSinPrecio.rows[0]?.libros_sin_precio || 0;

    return {
      total_unidades: metricas.total_unidades,
      titulos_con_stock: metricas.titulos_con_stock,
      bajo_stock: metricas.bajo_stock,
      agotados: metricas.agotados,
      obsoletos: metricas.obsoletos,
      libros_sin_precio: librosSinPrecio,
      alertas_bajo_stock: resAlertas.rows,
    };
  }
}

module.exports = new InventarioRepository();

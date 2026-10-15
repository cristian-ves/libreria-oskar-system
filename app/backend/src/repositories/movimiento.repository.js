const {
  TipoMovimiento,
  MovimientoInventario,
  Inventario,
  Libro,
  Bodega,
  Sucursal,
  Usuario,
  sequelize,
} = require('../models');

class MovimientoRepository {
  /**
   * Obtiene el identificador y detalle de un tipo de movimiento por nombre (case-insensitive).
   * @param {string} nombre - 'Ingreso', 'Salida', 'Ajuste'
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<{ id: string, nombre: string, descripcion: string | null } | null>}
   */
  async getTipoMovimientoByName(nombre, executorOrOptions = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return null;
    }

    const cleanNombre = nombre.trim();

    // Compatibilidad transaccional temporal si se pasa un cliente pg activo
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        SELECT id, nombre, descripcion
        FROM tipo_movimientos
        WHERE LOWER(nombre) = LOWER($1)
        LIMIT 1;
      `;
      const res = await executorOrOptions.query(text, [cleanNombre]);
      return res.rows[0] || null;
    }

    const queryOptions = {
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      raw: true,
    };

    if (executorOrOptions && executorOrOptions.transaction) {
      queryOptions.transaction = executorOrOptions.transaction;
    }

    const tipo = await TipoMovimiento.findOne(queryOptions);
    return tipo || null;
  }

  /**
   * Asegura la existencia de un tipo de movimiento ('Ingreso', 'Salida', etc.) de forma idempotente.
   * @param {string} nombre
   * @param {string} [descripcion='']
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<{ id: string, nombre: string, descripcion: string | null }>}
   */
  async ensureTipoMovimiento(nombre, descripcion = '', executorOrOptions = {}) {
    const cleanNombre = nombre.trim();

    // Compatibilidad transaccional temporal si se pasa un cliente pg activo
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        INSERT INTO tipo_movimientos (nombre, descripcion)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO UPDATE
          SET nombre = EXCLUDED.nombre
        RETURNING id, nombre, descripcion;
      `;
      const res = await executorOrOptions.query(text, [cleanNombre, descripcion]);
      return res.rows[0];
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    let tipo = await TipoMovimiento.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      ...txOption,
    });

    if (tipo) {
      return tipo.get ? tipo.get({ plain: true }) : tipo;
    }

    const nuevoTipo = await TipoMovimiento.create(
      {
        nombre: cleanNombre,
        descripcion: descripcion || null,
      },
      txOption
    );

    return nuevoTipo.get({ plain: true });
  }

  /**
   * Inserta un nuevo registro de movimiento de inventario dentro de una transacción.
   * Dispara automáticamente el trigger PL/pgSQL 'tg_movimientos_inventario_stock'
   * que actualiza de forma atómica y pesimista el stock en la tabla inventarios.
   * 
   * NOTA CRÍTICA: NO actualizar stock_actual directamente desde JavaScript.
   * El stock es administrado exclusivamente por el trigger de PostgreSQL.
   * 
   * @param {import('pg').PoolClient | object} executorOrOptions
   * @param {{
   *   inventarioId: string,
   *   usuarioId: string,
   *   tipoMovimientoId: string,
   *   cantidad: number,
   *   motivoDetalle?: string
   * }} data
   * @returns {Promise<{
   *   id: string,
   *   inventario_id: string,
   *   usuario_id: string,
   *   tipo_movimiento_id: string,
   *   cantidad: number,
   *   motivo_detalle: string | null,
   *   fecha_movimiento: Date
   * }>}
   */
  async createMovimiento(executorOrOptions, { inventarioId, usuarioId, tipoMovimientoId, cantidad, motivoDetalle = null }) {
    // 1. Delegación transaccional con cliente pg activo (db.withTransaction en los servicios actuales)
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
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

      const res = await executorOrOptions.query(text, values);
      return res.rows[0];
    }

    // 2. Operación nativa con Sequelize ORM (usado con transacciones Sequelize o standalone)
    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const mov = await MovimientoInventario.create(
      {
        inventario_id: inventarioId,
        usuario_id: usuarioId,
        tipo_movimiento_id: tipoMovimientoId,
        cantidad: Number(cantidad),
        motivo_detalle: motivoDetalle || null,
      },
      txOption
    );

    return mov.get({ plain: true });
  }

  /**
   * Consulta el kardex / movimientos de inventario con filtros y paginación utilizando Sequelize ORM.
   * @param {{
   *   libroId?: string,
   *   bodegaId?: string,
   *   tipo?: string,
   *   limit?: number,
   *   offset?: number
   * }} filters
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<{
   *   total: number,
   *   limit: number,
   *   offset: number,
   *   movimientos: Array<Object>
   * }>}
   */
  async findAllWithFilters({ libroId = null, bodegaId = null, tipo = null, limit = 50, offset = 0 }, executorOrOptions = {}) {
    // Compatibilidad en caso de pasar cliente pg heredado
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
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

      const countSql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM movimientos_inventario m
        JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
        JOIN inventarios inv ON inv.id = m.inventario_id
        ${whereClause}
      `;

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
        executorOrOptions.query(countSql, countParams),
        executorOrOptions.query(dataSql, params),
      ]);

      const total = countRes.rows[0]?.total || 0;

      return {
        total,
        limit,
        offset,
        movimientos: dataRes.rows,
      };
    }

    // Consulta nativa con Sequelize ORM
    const whereInventario = {};
    if (libroId && typeof libroId === 'string' && libroId.trim()) {
      whereInventario.libro_id = libroId.trim();
    }
    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      whereInventario.bodega_id = bodegaId.trim();
    }

    let tipoIncludeWhere = undefined;
    if (tipo && typeof tipo === 'string' && tipo.trim()) {
      tipoIncludeWhere = sequelize.where(
        sequelize.fn('LOWER', sequelize.col('tipo_movimiento.nombre')),
        tipo.trim().toLowerCase()
      );
    }

    const queryOptions = {
      include: [
        {
          model: TipoMovimiento,
          as: 'tipo_movimiento',
          attributes: ['id', 'nombre'],
          ...(tipoIncludeWhere ? { where: tipoIncludeWhere } : {}),
        },
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre_completo'],
          required: false,
        },
        {
          model: Inventario,
          as: 'inventario',
          attributes: ['id', 'libro_id', 'bodega_id'],
          ...(Object.keys(whereInventario).length > 0 ? { where: whereInventario } : {}),
          include: [
            {
              model: Libro,
              as: 'libro',
              attributes: ['id', 'titulo', 'isbn'],
            },
            {
              model: Bodega,
              as: 'bodega',
              attributes: ['id', 'nombre'],
              include: [
                {
                  model: Sucursal,
                  as: 'sucursal',
                  attributes: ['id', 'nombre'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [['fecha_movimiento', 'DESC']],
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      distinct: true,
      ...(executorOrOptions && executorOrOptions.transaction ? { transaction: executorOrOptions.transaction } : {}),
    };

    const res = await MovimientoInventario.findAndCountAll(queryOptions);

    const movimientos = res.rows.map((m) => {
      const row = m.get ? m.get({ plain: true }) : m;
      return {
        id: row.id,
        fecha_movimiento: row.fecha_movimiento,
        tipo: row.tipo_movimiento ? row.tipo_movimiento.nombre : null,
        cantidad: row.cantidad,
        motivo_detalle: row.motivo_detalle,
        libro_id: row.inventario?.libro?.id || null,
        titulo: row.inventario?.libro?.titulo || null,
        isbn: row.inventario?.libro?.isbn || null,
        bodega_nombre: row.inventario?.bodega?.nombre || null,
        sucursal_nombre: row.inventario?.bodega?.sucursal?.nombre || null,
        usuario_nombre: row.usuario?.nombre_completo || null,
      };
    });

    return {
      total: res.count,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      movimientos,
    };
  }
}

module.exports = new MovimientoRepository();

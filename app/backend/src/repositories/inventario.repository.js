const {
  Inventario,
  Libro,
  Bodega,
  Sucursal,
  Autor,
  Categoria,
  sequelize,
  Sequelize,
} = require('../models');

const { Op } = Sequelize;

class InventarioRepository {
  /**
   * Busca el registro de inventario para un libro en una bodega específica.
   * @param {string} libroId
   * @param {string} bodegaId
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<object | null>}
  */
  async findByLibroAndBodega(libroId, bodegaId, executorOrOptions = {}) {
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const res = await executorOrOptions.query(
        `SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
         FROM inventarios WHERE libro_id = $1 AND bodega_id = $2 LIMIT 1;`,
        [libroId, bodegaId]
      );
      return res.rows[0] || null;
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const inv = await Inventario.findOne({
      where: {
        libro_id: libroId,
        bodega_id: bodegaId,
      },
      attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo', 'ultima_auditoria', 'creado_en'],
      raw: true,
      ...txOption,
    });

    return inv || null;
  }

  /**
   * Obtiene o crea el registro de inventario de forma atómica.
   * Si no existe, inicializa con stock 0 (el stock real se incrementa exclusivamente por movimientos y su trigger).
   * Soporta firma polimórfica: (executor, libroId, bodegaId, stockMinimo) o (libroId, bodegaId, stockMinimo, options).
   *
   * @param {import('pg').PoolClient | object | string} arg1
   * @param {string} arg2
   * @param {string} [arg3]
   * @param {number | object} [arg4]
   */
  async findOrCreate(arg1, arg2, arg3, arg4) {
    let executorOrOptions = {};
    let libroId;
    let bodegaId;
    let stockMinimo = 5;

    if (arg1 && typeof arg1 === 'object' && typeof arg1.query === 'function') {
      // Cliente pg legado: (client, libroId, bodegaId, stockMinimo)
      executorOrOptions = arg1;
      libroId = arg2;
      bodegaId = arg3;
      if (arg4 !== undefined && arg4 !== null && Number.isFinite(Number(arg4))) stockMinimo = Number(arg4);
    } else if (arg1 && typeof arg1 === 'object' && arg1.transaction) {
      // Opciones Sequelize como 1er param: (options, libroId, bodegaId, stockMinimo)
      executorOrOptions = arg1;
      libroId = arg2;
      bodegaId = arg3;
      if (arg4 !== undefined && arg4 !== null && Number.isFinite(Number(arg4))) stockMinimo = Number(arg4);
    } else if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      // Firma normal: (libroId, bodegaId, stockMinimo, options)
      libroId = arg1;
      bodegaId = arg2;
      if (arg3 !== undefined && arg3 !== null && typeof arg3 === 'number') stockMinimo = arg3;
      if (arg4 && typeof arg4 === 'object') executorOrOptions = arg4;
    } else {
      executorOrOptions = arg1 || {};
      libroId = arg2;
      bodegaId = arg3;
      if (arg4 !== undefined && arg4 !== null && Number.isFinite(Number(arg4))) stockMinimo = Number(arg4);
    }

    // Compatibilidad transaccional temporal con cliente pg activo
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        INSERT INTO inventarios (libro_id, bodega_id, stock_actual, stock_minimo)
        VALUES ($1, $2, 0, $3)
        ON CONFLICT (libro_id, bodega_id) DO UPDATE
          SET libro_id = EXCLUDED.libro_id
        RETURNING id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en;
      `;
      const res = await executorOrOptions.query(text, [libroId, bodegaId, stockMinimo]);
      return res.rows[0];
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    try {
      const [inv] = await Inventario.findOrCreate({
        where: {
          libro_id: libroId,
          bodega_id: bodegaId,
        },
        defaults: {
          stock_actual: 0,
          stock_minimo: stockMinimo,
        },
        ...txOption,
      });

      return inv.get ? inv.get({ plain: true }) : inv;
    } catch (err) {
      // Manejar condición de carrera si otra transacción insertó en paralelo
      if (err.name === 'SequelizeUniqueConstraintError') {
        const existing = await Inventario.findOne({
          where: {
            libro_id: libroId,
            bodega_id: bodegaId,
          },
          attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo', 'ultima_auditoria', 'creado_en'],
          raw: true,
          ...txOption,
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Consulta el estado actual de inventario por su ID.
   * @param {string} id
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   */
  async findById(id, executorOrOptions = {}) {
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const res = await executorOrOptions.query(
        `SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
         FROM inventarios WHERE id = $1;`,
        [id]
      );
      return res.rows[0] || null;
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const inv = await Inventario.findByPk(id, {
      attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo', 'ultima_auditoria', 'creado_en'],
      raw: true,
      ...txOption,
    });

    return inv || null;
  }

  /**
   * Lista todos los registros de inventario de un libro por bodega,
   * incluyendo nombre de bodega y sucursal.
   * @param {string} libroId
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<Array<{id: string, bodega_id: string, bodega_nombre: string, sucursal_nombre: string, stock_actual: number, stock_minimo: number}>>}
  */
  async findByLibroId(libroId, executorOrOptions = {}) {
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const res = await executorOrOptions.query(
        `SELECT inv.id, inv.bodega_id, b.nombre AS bodega_nombre,
                s.nombre AS sucursal_nombre, inv.stock_actual, inv.stock_minimo
         FROM inventarios inv
         JOIN bodegas b ON b.id = inv.bodega_id
         LEFT JOIN sucursales s ON s.id = b.sucursal_id
         WHERE inv.libro_id = $1
         ORDER BY s.nombre, b.nombre;`,
        [libroId]
      );
      return res.rows;
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const inventarios = await Inventario.findAll({
      where: { libro_id: libroId },
      attributes: ['id', 'bodega_id', 'stock_actual', 'stock_minimo'],
      include: [
        {
          model: Bodega,
          as: 'bodega',
          attributes: ['id', 'nombre'],
          required: true,
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
      order: [
        [{ model: Bodega, as: 'bodega' }, { model: Sucursal, as: 'sucursal' }, 'nombre', 'ASC'],
        [{ model: Bodega, as: 'bodega' }, 'nombre', 'ASC'],
      ],
      ...txOption,
    });

    return inventarios.map((inv) => {
      const plain = inv.get ? inv.get({ plain: true }) : inv;
      return {
        id: plain.id,
        bodega_id: plain.bodega_id,
        bodega_nombre: plain.bodega?.nombre || null,
        sucursal_nombre: plain.bodega?.sucursal?.nombre || null,
        stock_actual: plain.stock_actual,
        stock_minimo: plain.stock_minimo,
      };
    });
  }

  /**
   * Actualiza el stock_minimo de un inventario existente sin modificar el stock_actual.
   * Soporta: (executor, inventarioId, stockMinimo) o (inventarioId, stockMinimo, options).
   *
   * @param {import('pg').PoolClient | object | string} arg1
   * @param {string | number} arg2
   * @param {number | object} [arg3]
   */
  async setStockMinimo(arg1, arg2, arg3) {
    let executorOrOptions = {};
    let inventarioId;
    let stockMinimo;

    if (typeof arg1 === 'string') {
      inventarioId = arg1;
      stockMinimo = arg2;
      executorOrOptions = arg3 || {};
    } else {
      executorOrOptions = arg1 || {};
      inventarioId = arg2;
      stockMinimo = arg3;
    }

    // Compatibilidad transaccional con cliente pg activo
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        UPDATE inventarios
        SET stock_minimo = $2
        WHERE id = $1
        RETURNING id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en;
      `;
      const res = await executorOrOptions.query(text, [inventarioId, stockMinimo]);
      return res.rows[0] || null;
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const inv = await Inventario.findByPk(inventarioId, txOption);
    if (!inv) return null;

    // Actualización atómica exclusiva de stock_minimo (sin alterar stock_actual)
    await inv.update({ stock_minimo: Number(stockMinimo) }, txOption);

    return {
      id: inv.id,
      libro_id: inv.libro_id,
      bodega_id: inv.bodega_id,
      stock_actual: inv.stock_actual,
      stock_minimo: inv.stock_minimo,
      ultima_auditoria: inv.ultima_auditoria,
      creado_en: inv.creado_en,
    };
  }

  /**
   * Bloquea y consulta un registro de inventario con bloqueo pesimista FOR UPDATE.
   * Requiere obligatoriamente una transacción activa en Sequelize ({ transaction })
   * o un cliente pg con transacción activa.
   *
   * @param {string} id
   * @param {import('pg').PoolClient | object} executorOrOptions
   */
  async findByIdForUpdate(id, executorOrOptions) {
    // Compatibilidad transaccional con cliente pg activo
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        SELECT id, libro_id, bodega_id, stock_actual, stock_minimo, ultima_auditoria, creado_en
        FROM inventarios
        WHERE id = $1
        FOR UPDATE;
      `;
      const res = await executorOrOptions.query(text, [id]);
      return res.rows[0] || null;
    }

    const transaction = executorOrOptions?.transaction;
    if (!transaction) {
      throw new Error('findByIdForUpdate requiere una transacción activa ({ transaction }) para garantizar el bloqueo pesimista.');
    }

    const inv = await Inventario.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
      raw: true,
    });

    return inv || null;
  }

  /**
   * Lista el inventario detallado por libro y bodega con métricas calculadas y filtros.
   * @param {{ estado?: string, q?: string, bodegaId?: string, diasStockObsoleto?: number }} params
   * @param {object | import('pg').PoolClient} [executorOrOptions]
  */
  async findAllWithDetails({ estado = 'todos', q = '', bodegaId = null, diasStockObsoleto = 90 }, executorOrOptions = {}) {
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const params = [diasStockObsoleto];
      const conditions = [];
      if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
        params.push(bodegaId.trim());
        conditions.push(`inv.bodega_id = $${params.length}`);
      }
      if (q && typeof q === 'string' && q.trim()) {
        params.push(`%${q.trim()}%`);
        conditions.push(`(LOWER(l.titulo) LIKE LOWER($${params.length})
          OR LOWER(COALESCE(a.nombre, '')) LIKE LOWER($${params.length})
          OR l.isbn LIKE $${params.length})`);
      }
      if (estado === 'en_stock') conditions.push('inv.stock_actual > inv.stock_minimo');
      if (estado === 'bajo_stock') conditions.push('inv.stock_actual <= inv.stock_minimo');
      if (estado === 'obsoleto') {
        conditions.push(`(inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en)
          < (NOW() - ($1 || ' days')::INTERVAL))`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await executorOrOptions.query(
        `SELECT inv.id AS inventario_id, inv.libro_id, l.titulo, l.isbn, l.imagen_url,
                a.nombre AS autor, c.nombre AS categoria, b.id AS bodega_id,
                b.nombre AS bodega_nombre, s.nombre AS sucursal_nombre,
                inv.stock_actual, inv.stock_minimo, ult_sal.fecha_movimiento AS ultima_salida,
                (inv.stock_actual <= inv.stock_minimo) AS bajo_stock,
                (inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en)
                  < (NOW() - ($1 || ' days')::INTERVAL)) AS obsoleto
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
         ${where}
         ORDER BY l.titulo ASC LIMIT 200;`,
        params
      );
      return rows;
    }

    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const params = [diasStockObsoleto];
      const conditions = [];
      if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
        params.push(bodegaId.trim());
        conditions.push(`inv.bodega_id = $${params.length}`);
      }
      if (q && typeof q === 'string' && q.trim()) {
        params.push(`%${q.trim()}%`);
        conditions.push(`(LOWER(l.titulo) LIKE LOWER($${params.length})
          OR LOWER(COALESCE(a.nombre, '')) LIKE LOWER($${params.length})
          OR l.isbn LIKE $${params.length})`);
      }
      if (estado === 'en_stock') conditions.push('inv.stock_actual > inv.stock_minimo');
      if (estado === 'bajo_stock') conditions.push('inv.stock_actual <= inv.stock_minimo');
      if (estado === 'obsoleto') {
        conditions.push(`(inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en)
          < (NOW() - ($1 || ' days')::INTERVAL))`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await executorOrOptions.query(
        `SELECT inv.id AS inventario_id, inv.libro_id, l.titulo, l.isbn, l.imagen_url,
                a.nombre AS autor, c.nombre AS categoria, b.id AS bodega_id,
                b.nombre AS bodega_nombre, s.nombre AS sucursal_nombre,
                inv.stock_actual, inv.stock_minimo, ult_sal.fecha_movimiento AS ultima_salida,
                (inv.stock_actual <= inv.stock_minimo) AS bajo_stock,
                (inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en)
                  < (NOW() - ($1 || ' days')::INTERVAL)) AS obsoleto
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
         ${where}
         ORDER BY l.titulo ASC LIMIT 200;`,
        params
      );
      return rows;
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const ultSal = `(
      SELECT MAX(m.fecha_movimiento)
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      WHERE m.inventario_id = "Inventario"."id" AND LOWER(tm.nombre) = 'salida'
    )`;

    const whereConditions = [];

    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      whereConditions.push({ bodega_id: bodegaId.trim() });
    }

    if (q && typeof q === 'string' && q.trim()) {
      const escaped = sequelize.escape(`%${q.trim().toLowerCase()}%`);
      whereConditions.push(
        sequelize.literal(`(
          LOWER("libro"."titulo") LIKE ${escaped}
          OR LOWER(COALESCE("libro->autor"."nombre", '')) LIKE ${escaped}
          OR LOWER("libro"."isbn") LIKE ${escaped}
        )`)
      );
    }

    const diasNum = Number(diasStockObsoleto) || 90;

    if (estado === 'en_stock') {
      whereConditions.push(sequelize.literal('"Inventario"."stock_actual" > "Inventario"."stock_minimo"'));
    } else if (estado === 'bajo_stock') {
      whereConditions.push(sequelize.literal('"Inventario"."stock_actual" <= "Inventario"."stock_minimo"'));
    } else if (estado === 'obsoleto') {
      whereConditions.push(
        sequelize.literal(`(
          "Inventario"."stock_actual" > 0 AND
          COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL)
        )`)
      );
    }

    const results = await Inventario.findAll({
      where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : undefined,
      attributes: [
        'id',
        'libro_id',
        'bodega_id',
        'stock_actual',
        'stock_minimo',
        [sequelize.literal(ultSal), 'ultima_salida'],
        [sequelize.literal('("Inventario"."stock_actual" <= "Inventario"."stock_minimo")'), 'bajo_stock'],
        [
          sequelize.literal(`(
            "Inventario"."stock_actual" > 0 AND
            COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL)
          )`),
          'obsoleto',
        ],
      ],
      include: [
        {
          model: Libro,
          as: 'libro',
          attributes: ['id', 'titulo', 'isbn', 'imagen_url'],
          include: [
            {
              model: Autor,
              as: 'autor',
              attributes: ['id', 'nombre'],
              required: false,
            },
            {
              model: Categoria,
              as: 'categoria',
              attributes: ['id', 'nombre'],
              required: false,
            },
          ],
          required: true,
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
          required: true,
        },
      ],
      order: [[{ model: Libro, as: 'libro' }, 'titulo', 'ASC']],
      limit: 200,
      ...txOption,
    });

    return results.map((item) => {
      const r = item.get ? item.get({ plain: true }) : item;
      return {
        inventario_id: r.id,
        libro_id: r.libro_id,
        titulo: r.libro?.titulo || null,
        isbn: r.libro?.isbn || null,
        imagen_url: r.libro?.imagen_url || null,
        autor: r.libro?.autor?.nombre || null,
        categoria: r.libro?.categoria?.nombre || null,
        bodega_id: r.bodega_id,
        bodega_nombre: r.bodega?.nombre || null,
        sucursal_nombre: r.bodega?.sucursal?.nombre || null,
        stock_actual: r.stock_actual,
        stock_minimo: r.stock_minimo,
        ultima_salida: r.ultima_salida,
        bajo_stock: Boolean(r.bajo_stock),
        obsoleto: Boolean(r.obsoleto),
      };
    });
  }

  /**
   * Obtiene el resumen general del inventario, alertas y libros sin precio.
   * @param {number} diasStockObsoleto
   * @param {object | import('pg').PoolClient} [executorOrOptions]
  */
  async getResumen(diasStockObsoleto = 90, executorOrOptions = {}) {
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const metricasSql = `
        SELECT COALESCE(SUM(inv.stock_actual), 0)::INTEGER AS total_unidades,
          COUNT(DISTINCT CASE WHEN inv.stock_actual > 0 THEN inv.libro_id END)::INTEGER AS titulos_con_stock,
          COUNT(CASE WHEN inv.stock_actual <= inv.stock_minimo THEN 1 END)::INTEGER AS bajo_stock,
          COUNT(CASE WHEN inv.stock_actual = 0 THEN 1 END)::INTEGER AS agotados,
          COUNT(CASE WHEN inv.stock_actual > 0 AND COALESCE(ult_sal.fecha_movimiento, inv.creado_en)
            < (NOW() - ($1 || ' days')::INTERVAL) THEN 1 END)::INTEGER AS obsoletos
        FROM inventarios inv
        LEFT JOIN LATERAL (
          SELECT MAX(m.fecha_movimiento) AS fecha_movimiento
          FROM movimientos_inventario m
          JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
          WHERE m.inventario_id = inv.id AND LOWER(tm.nombre) = 'salida'
        ) ult_sal ON true;`;
      const sinPrecioSql = `SELECT COUNT(*)::INTEGER AS libros_sin_precio FROM libros
        WHERE activo = true AND (precio = 0 OR precio IS NULL);`;
      const alertasSql = `SELECT l.titulo, b.nombre AS bodega_nombre, inv.stock_actual, inv.stock_minimo
        FROM inventarios inv JOIN libros l ON l.id = inv.libro_id
        JOIN bodegas b ON b.id = inv.bodega_id
        WHERE inv.stock_actual <= inv.stock_minimo
        ORDER BY (inv.stock_actual - inv.stock_minimo) ASC LIMIT 10;`;
      const [metricasRes, sinPrecioRes, alertasRes] = await Promise.all([
        executorOrOptions.query(metricasSql, [diasStockObsoleto]),
        executorOrOptions.query(sinPrecioSql),
        executorOrOptions.query(alertasSql),
      ]);
      const metricas = metricasRes.rows[0] || {};
      return {
        total_unidades: metricas.total_unidades || 0,
        titulos_con_stock: metricas.titulos_con_stock || 0,
        bajo_stock: metricas.bajo_stock || 0,
        agotados: metricas.agotados || 0,
        obsoletos: metricas.obsoletos || 0,
        libros_sin_precio: sinPrecioRes.rows[0]?.libros_sin_precio || 0,
        alertas_bajo_stock: alertasRes.rows,
      };
    }

    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    const diasNum = Number(diasStockObsoleto) || 90;
    const ultSal = `(
      SELECT MAX(m.fecha_movimiento)
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      WHERE m.inventario_id = "Inventario"."id" AND LOWER(tm.nombre) = 'salida'
    )`;

    const queryMetricas = Inventario.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('stock_actual')), 0), 'total_unidades'],
        [sequelize.literal('COUNT(DISTINCT CASE WHEN "Inventario"."stock_actual" > 0 THEN "Inventario"."libro_id" END)'), 'titulos_con_stock'],
        [sequelize.literal('COUNT(CASE WHEN "Inventario"."stock_actual" <= "Inventario"."stock_minimo" THEN 1 END)'), 'bajo_stock'],
        [sequelize.literal('COUNT(CASE WHEN "Inventario"."stock_actual" = 0 THEN 1 END)'), 'agotados'],
        [sequelize.literal(`COUNT(CASE WHEN "Inventario"."stock_actual" > 0 AND COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL) THEN 1 END)`), 'obsoletos'],
      ],
      raw: true,
      ...txOption,
    });

    const querySinPrecio = Libro.count({
      where: {
        activo: true,
        [Op.or]: [
          { precio: 0 },
          { precio: null },
        ],
      },
      ...txOption,
    });

    const queryAlertas = Inventario.findAll({
      where: sequelize.literal('"Inventario"."stock_actual" <= "Inventario"."stock_minimo"'),
      attributes: ['stock_actual', 'stock_minimo'],
      include: [
        {
          model: Libro,
          as: 'libro',
          attributes: ['titulo'],
          required: true,
        },
        {
          model: Bodega,
          as: 'bodega',
          attributes: ['nombre'],
          required: true,
        },
      ],
      order: [
        [sequelize.literal('("Inventario"."stock_actual" - "Inventario"."stock_minimo")'), 'ASC'],
      ],
      limit: 10,
      raw: true,
      nest: true,
      ...txOption,
    });

    const [resMetricas, librosSinPrecio, resAlertas] = await Promise.all([
      queryMetricas,
      querySinPrecio,
      queryAlertas,
    ]);

    const metricasRow = resMetricas[0] || {};

    const alertas_bajo_stock = resAlertas.map((a) => ({
      titulo: a.libro?.titulo || '',
      bodega_nombre: a.bodega?.nombre || '',
      stock_actual: a.stock_actual,
      stock_minimo: a.stock_minimo,
    }));

    return {
      total_unidades: parseInt(metricasRow.total_unidades || 0, 10),
      titulos_con_stock: parseInt(metricasRow.titulos_con_stock || 0, 10),
      bajo_stock: parseInt(metricasRow.bajo_stock || 0, 10),
      agotados: parseInt(metricasRow.agotados || 0, 10),
      obsoletos: parseInt(metricasRow.obsoletos || 0, 10),
      libros_sin_precio: librosSinPrecio,
      alertas_bajo_stock,
    };
  }
}

module.exports = new InventarioRepository();

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
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<object | null>}
  */
  async findByLibroAndBodega(libroId, bodegaId, options = {}) {
    const inv = await Inventario.findOne({
      where: {
        libro_id: libroId,
        bodega_id: bodegaId,
      },
      attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo', 'ultima_auditoria', 'creado_en'],
      raw: true,
      ...options,
    });

    return inv || null;
  }

  /**
   * Obtiene o crea el registro de inventario de forma atómica.
   * Si no existe, inicializa con stock 0 (el stock real se incrementa exclusivamente por movimientos y su trigger).
   * Soporta las firmas (options, libroId, bodegaId, stockMinimo) y
   * (libroId, bodegaId, stockMinimo, options).
   *
   * @param {object | string} arg1
   * @param {string} arg2
   * @param {string} [arg3]
   * @param {number | object} [arg4]
   */
  async findOrCreate(arg1, arg2, arg3, arg4) {
    let options = {};
    let libroId;
    let bodegaId;
    let stockMinimo = 5;

    if (arg1 && typeof arg1 === 'object') {
      options = arg1;
      libroId = arg2;
      bodegaId = arg3;
      if (arg4 !== undefined && arg4 !== null && Number.isFinite(Number(arg4))) stockMinimo = Number(arg4);
    } else if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      // Firma normal: (libroId, bodegaId, stockMinimo, options)
      libroId = arg1;
      bodegaId = arg2;
      if (arg3 !== undefined && arg3 !== null && typeof arg3 === 'number') stockMinimo = arg3;
      if (arg4 && typeof arg4 === 'object') options = arg4;
    }

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
        ...options,
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
          ...options,
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Consulta el estado actual de inventario por su ID.
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   */
  async findById(id, options = {}) {
    const inv = await Inventario.findByPk(id, {
      attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo', 'ultima_auditoria', 'creado_en'],
      raw: true,
      ...options,
    });

    return inv || null;
  }

  /**
   * Lista todos los registros de inventario de un libro por bodega,
   * incluyendo nombre de bodega y sucursal.
   * @param {string} libroId
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Array<{id: string, bodega_id: string, bodega_nombre: string, sucursal_nombre: string, stock_actual: number, stock_minimo: number}>>}
  */
  async findByLibroId(libroId, options = {}) {
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
      ...options,
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
   * Soporta: (options, inventarioId, stockMinimo) o (inventarioId, stockMinimo, options).
   *
   * @param {object | string} arg1
   * @param {string | number} arg2
   * @param {number | object} [arg3]
   */
  async setStockMinimo(arg1, arg2, arg3) {
    let options = {};
    let inventarioId;
    let stockMinimo;

    if (typeof arg1 === 'string') {
      inventarioId = arg1;
      stockMinimo = arg2;
      options = arg3 || {};
    } else {
      options = arg1 || {};
      inventarioId = arg2;
      stockMinimo = arg3;
    }

    const inv = await Inventario.findByPk(inventarioId, options);
    if (!inv) return null;

    // Actualización atómica exclusiva de stock_minimo (sin alterar stock_actual)
    await inv.update({ stock_minimo: Number(stockMinimo) }, options);

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
   * mediante Sequelize ({ transaction }).
   *
   * @param {string} id
   * @param {{ transaction: import('sequelize').Transaction }} options
   */
  async findByIdForUpdate(id, options) {
    const transaction = options?.transaction;
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
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
  */
  async findAllWithDetails({ estado = 'todos', q = '', bodegaId = null, diasStockObsoleto = 90 }, options = {}) {
    const txOption = options.transaction ? { transaction: options.transaction } : {};

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
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
  */
  async getResumen(diasStockObsoleto = 90, options = {}) {
    const txOption = options.transaction ? { transaction: options.transaction } : {};

    const diasNum = Number(diasStockObsoleto) || 90;
    const ultSal = `(
      SELECT MAX(m.fecha_movimiento)
      FROM movimientos_inventario m
      JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
      WHERE m.inventario_id = "Inventario"."id" AND LOWER(tm.nombre) = 'salida'
    )`;

    const loadMetricas = () => Inventario.findAll({
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

    const loadSinPrecio = () => Libro.count({
      where: {
        activo: true,
        [Op.or]: [
          { precio: 0 },
          { precio: null },
        ],
      },
      ...txOption,
    });

    const loadAlertas = () => Inventario.findAll({
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

    let resMetricas;
    let librosSinPrecio;
    let resAlertas;

    if (options.transaction) {
      // Una transacción Sequelize usa una conexión; serializar evita consultas
      // concurrentes sobre el mismo cliente PostgreSQL.
      resMetricas = await loadMetricas();
      librosSinPrecio = await loadSinPrecio();
      resAlertas = await loadAlertas();
    } else {
      [resMetricas, librosSinPrecio, resAlertas] = await Promise.all([
        loadMetricas(),
        loadSinPrecio(),
        loadAlertas(),
      ]);
    }

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

const {
  Inventario,
  Bodega,
  Sucursal,
} = require('../../models');

// Operaciones básicas y bloqueos. Los métodos se copian al prototipo de la
// fachada, así que `this` es la instancia única del repositorio.
module.exports = {
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
  },

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
  },

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
  },

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
  },

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
  },

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
  },
};

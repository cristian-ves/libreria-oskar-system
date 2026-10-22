const { Op, fn, col } = require('sequelize');
const { Venta, VentaDetalle, Bodega, Usuario, Libro } = require('../models');

function txOption(options) {
  return options && options.transaction ? { transaction: options.transaction } : {};
}

function plano(fila) {
  if (!fila) return null;
  return fila.get ? fila.get({ plain: true }) : fila;
}

class VentaRepository {
  /**
   * Inserta la cabecera de la venta. El `numero` lo asigna la BD (ventas_numero_seq).
   * @param {{ transaction?: import('sequelize').Transaction }} options
   * @param {object} data - atributos en snake_case de `ventas`
   * @returns {Promise<object>} fila plana con `id`, `numero` y `creado_en`
   */
  async createVenta(options, data) {
    return plano(await Venta.create(data, txOption(options)));
  }

  /**
   * Inserta todas las líneas de la venta.
   * @param {{ transaction?: import('sequelize').Transaction }} options
   * @param {Array<object>} detalles - atributos en snake_case de `venta_detalles`
   */
  async createDetalles(options, detalles) {
    const filas = await VentaDetalle.bulkCreate(detalles, txOption(options));
    return filas.map(plano);
  }

  /**
   * Bloquea la cabecera de la venta con FOR UPDATE. Requiere transacción.
   * @param {string} id
   * @param {{ transaction: import('sequelize').Transaction }} options
   */
  async findByIdForUpdate(id, options) {
    const transaction = options && options.transaction;
    if (!transaction) {
      throw new Error('findByIdForUpdate requiere una transacción activa ({ transaction }) para garantizar el bloqueo pesimista.');
    }
    const venta = await Venta.findByPk(id, { lock: transaction.LOCK.UPDATE, transaction, raw: true });
    return venta || null;
  }

  /**
   * Líneas de una venta (libro y cantidad), sin relaciones.
   * @param {string} ventaId
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   */
  async findLineasByVenta(ventaId, options = {}) {
    return VentaDetalle.findAll({
      where: { venta_id: ventaId },
      attributes: ['libro_id', 'cantidad'],
      raw: true,
      ...txOption(options),
    });
  }

  /**
   * Marca la venta como anulada en un solo UPDATE (respeta ck_ventas_anulacion).
   * @param {string} id
   * @param {{ anuladaPor: string, motivo: string, fecha?: Date }} datos
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   */
  async marcarAnulada(id, { anuladaPor, motivo, fecha = new Date() }, options = {}) {
    const [filas] = await Venta.update(
      { estado: 'Anulada', anulada_en: fecha, anulada_por: anuladaPor, motivo_anulacion: motivo },
      { where: { id }, ...txOption(options) }
    );
    return filas;
  }

  /**
   * Venta con bodega, vendedor, anulador y líneas (con datos del libro), en formato plano.
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   */
  async findDetalleById(id, options = {}) {
    const venta = await Venta.findByPk(id, {
      include: [
        { model: Bodega, as: 'bodega', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'anulador', attributes: ['id', 'nombre_completo'], required: false },
        {
          model: VentaDetalle,
          as: 'detalles',
          attributes: ['libro_id', 'cantidad', 'precio_unitario', 'subtotal'],
          include: [{ model: Libro, as: 'libro', attributes: ['titulo', 'isbn'] }],
        },
      ],
      order: [
        [{ model: VentaDetalle, as: 'detalles' }, { model: Libro, as: 'libro' }, 'titulo', 'ASC'],
        [{ model: VentaDetalle, as: 'detalles' }, 'libro_id', 'ASC'],
      ],
      ...txOption(options),
    });
    return plano(venta);
  }

  /**
   * Página de ventas (más recientes primero) con bodega y vendedor.
   * @param {{ estado?: string|null, inicio?: Date|null, finExclusivo?: Date|null, limit: number, offset: number }} filtros
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ total: number, ventas: Array<object> }>}
   */
  async findPagina({ estado = null, inicio = null, finExclusivo = null, limit, offset }, options = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (inicio || finExclusivo) {
      where.creado_en = {
        ...(inicio ? { [Op.gte]: inicio } : {}),
        ...(finExclusivo ? { [Op.lt]: finExclusivo } : {}),
      };
    }

    const { count, rows } = await Venta.findAndCountAll({
      where,
      include: [
        { model: Bodega, as: 'bodega', attributes: ['nombre'] },
        { model: Usuario, as: 'vendedor', attributes: ['nombre_completo'] },
      ],
      order: [['creado_en', 'DESC'], ['numero', 'DESC']],
      limit,
      offset,
      ...txOption(options),
    });

    return { total: count, ventas: rows.map(plano) };
  }

  /**
   * Número de líneas y unidades de cada venta, agregados con Sequelize.
   * @param {string[]} ventaIds
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Array<{ venta_id: string, lineas: string, unidades: string }>>}
   */
  async contarLineasPorVentas(ventaIds, options = {}) {
    if (!Array.isArray(ventaIds) || ventaIds.length === 0) return [];
    return VentaDetalle.findAll({
      where: { venta_id: { [Op.in]: ventaIds } },
      attributes: ['venta_id', [fn('COUNT', col('id')), 'lineas'], [fn('SUM', col('cantidad')), 'unidades']],
      group: ['venta_id'],
      raw: true,
      ...txOption(options),
    });
  }
}

module.exports = new VentaRepository();

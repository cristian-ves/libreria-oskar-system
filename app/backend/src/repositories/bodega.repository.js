const { Op, fn, col, where } = require('sequelize');
const { Bodega, Sucursal, Inventario, Venta } = require('../models');

class BodegaRepository {
  /**
   * Busca una bodega activa por id.
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string } | null>}
   */
  async findActivaById(id, options = {}) {
    const { transaction } = options;
    let bodega;
    if (transaction) {
      const ref = await Bodega.findByPk(id, { attributes: ['id', 'sucursal_id'], transaction });
      if (!ref) return null;
      const sucursal = await Sucursal.findByPk(ref.sucursal_id, { transaction, lock: transaction.LOCK.UPDATE });
      bodega = await Bodega.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sucursal?.activo || !bodega?.activo || bodega.sucursal_id !== ref.sucursal_id) return null;
      return { id: bodega.id, nombre: bodega.nombre, sucursal_id: bodega.sucursal_id };
    }
    bodega = await Bodega.findOne({
      where: { id, activo: true }, attributes: ['id', 'nombre', 'sucursal_id'],
      include: [{ model: Sucursal, as: 'sucursal', attributes: [], where: { activo: true }, required: true }], raw: true,
    });
    return bodega || null;
  }

  async findById(id, options = {}) {
    const row = await Bodega.findByPk(id, {
      ...(options.transaction ? { transaction: options.transaction } : {}),
      include: [{ model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre', 'activo'] }],
    });
    return row ? row.get({ plain: true }) : null;
  }

  async findByIdForUpdate(id, options) {
    const row = await Bodega.findByPk(id, { transaction: options.transaction, lock: options.transaction.LOCK.UPDATE });
    return row || null;
  }

  async findSucursalId(id, transaction) {
    const row = await Bodega.findByPk(id, { attributes: ['id', 'sucursal_id'], transaction });
    return row ? row.sucursal_id : null;
  }

  async findSucursalForUpdate(id, transaction) {
    const row = await Sucursal.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    return row || null;
  }

  async create(datos, transaction) { return (await Bodega.create(datos, { transaction })).get({ plain: true }); }

  async update(id, datos, transaction) {
    await Bodega.update(datos, { where: { id }, transaction });
    return this.findById(id, { transaction });
  }

  async findBySucursal(sucursalId, { activo, q = '', transaction } = {}) {
    const whereClause = { sucursal_id: sucursalId };
    if (activo !== undefined) whereClause.activo = activo;
    if (q.trim()) whereClause.nombre = { [Op.iLike]: `%${q.trim()}%` };
    const rows = await Bodega.findAll({ where: whereClause, order: [['nombre', 'ASC'], ['id', 'ASC']], transaction });
    return rows.map((row) => row.get({ plain: true }));
  }

  async findByNombreNormalizado(sucursalId, nombre, { excludeId, transaction } = {}) {
    const condition = where(fn('lower', fn('btrim', col('nombre'))), nombre.toLowerCase());
    const row = await Bodega.findOne({
      where: { sucursal_id: sucursalId, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}), [Op.and]: [condition] },
      attributes: ['id', 'nombre'], raw: true, ...(transaction ? { transaction } : {}),
    });
    return row || null;
  }

  async countConStock(id, transaction) {
    return Inventario.count({ where: { bodega_id: id, stock_actual: { [Op.gt]: 0 } }, transaction });
  }

  async countInventarios(id, transaction) { return Inventario.count({ where: { bodega_id: id }, transaction }); }
  async countVentas(id, transaction) { return Venta.count({ where: { bodega_id: id }, transaction }); }

  /**
   * Obtiene todas las bodegas activas con el nombre de su sucursal.
   * Query copiada exactamente del handler inline de GET /api/bodegas en routes/index.js.
   * @returns {Promise<Array<{ id: string, nombre: string, descripcion: string, sucursal_nombre: string|null }>>}
   */
  async findActivas() {
    const bodegas = await Bodega.findAll({
      attributes: ['id', 'nombre', 'descripcion'],
      where: { activo: true },
      include: [{
        model: Sucursal,
        as: 'sucursal',
        attributes: ['nombre'],
        where: { activo: true },
        required: true,
      }],
      order: [
        [{ model: Sucursal, as: 'sucursal' }, 'nombre', 'ASC'],
        ['nombre', 'ASC'],
      ],
    });

    return bodegas.map((bodega) => {
      const plain = bodega.get({ plain: true });
      return {
        id: plain.id,
        nombre: plain.nombre,
        descripcion: plain.descripcion,
        sucursal_nombre: plain.sucursal?.nombre ?? null,
      };
    });
  }
}

module.exports = new BodegaRepository();

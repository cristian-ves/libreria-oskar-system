const { Op, fn, col, where } = require('sequelize');
const { Sucursal, Bodega, Inventario } = require('../models');

const tx = (options = {}) => (options.transaction ? { transaction: options.transaction } : {});
const plain = (row) => (row ? row.get({ plain: true }) : null);

class SucursalRepository {
  async findAll({ activo, q = '' } = {}) {
    const whereClause = {};
    if (activo !== undefined) whereClause.activo = activo;
    if (q.trim()) whereClause.nombre = { [Op.iLike]: `%${q.trim()}%` };
    const rows = await Sucursal.findAll({
      where: whereClause,
      order: [['nombre', 'ASC'], ['id', 'ASC']],
      include: [{ model: Bodega, as: 'bodegas', attributes: ['id', 'nombre', 'activo'], required: false }],
    });
    return rows.map(plain);
  }

  async findById(id, options = {}) {
    const row = await Sucursal.findByPk(id, {
      ...tx(options),
      include: [{ model: Bodega, as: 'bodegas', attributes: ['id', 'nombre', 'descripcion', 'activo'], required: false }],
    });
    return plain(row);
  }

  async findByIdForUpdate(id, options) {
    const row = await Sucursal.findByPk(id, { transaction: options.transaction, lock: options.transaction.LOCK.UPDATE });
    return plain(row);
  }

  async findBodegasForUpdate(sucursalId, transaction) {
    const rows = await Bodega.findAll({
      where: { sucursal_id: sucursalId }, attributes: ['id', 'activo'],
      order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE,
    });
    return rows.map((row) => row.get({ plain: true }));
  }

  async contarStockPositivo(sucursalId, transaction) {
    return Inventario.count({
      where: { stock_actual: { [Op.gt]: 0 } },
      include: [{ model: Bodega, as: 'bodega', attributes: [], where: { sucursal_id: sucursalId }, required: true }],
      transaction,
    });
  }

  async findByNombreNormalizado(nombre, { excludeId, transaction } = {}) {
    const condition = where(fn('lower', fn('btrim', col('nombre'))), nombre.toLowerCase());
    const row = await Sucursal.findOne({
      where: { ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}), [Op.and]: [condition] },
      attributes: ['id', 'nombre'], raw: true, ...(transaction ? { transaction } : {}),
    });
    return row || null;
  }

  async create(datos, options = {}) { return plain(await Sucursal.create(datos, tx(options))); }

  async update(id, datos, options = {}) {
    await Sucursal.update(datos, { where: { id }, ...tx(options) });
    return this.findById(id, options);
  }
}

module.exports = new SucursalRepository();

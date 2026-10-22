const { Bodega, Sucursal } = require('../models');

class BodegaRepository {
  /**
   * Busca una bodega activa por id.
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string } | null>}
   */
  async findActivaById(id, options = {}) {
    const bodega = await Bodega.findOne({
      where: { id, activo: true },
      attributes: ['id', 'nombre'],
      raw: true,
      ...(options.transaction ? { transaction: options.transaction } : {}),
    });
    return bodega || null;
  }

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

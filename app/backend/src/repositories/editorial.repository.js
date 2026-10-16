const { Editorial, sequelize } = require('../models');

class EditorialRepository {
  /**
   * Busca una editorial por su nombre (búsqueda insensible a mayúsculas/minúsculas).
   * @param {string} nombre
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string, pais: string | null, creado_en: Date } | null>}
   */
  async findByNombre(nombre, options = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return null;
    }

    const cleanNombre = nombre.trim();

    const queryOptions = {
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      raw: true,
    };

    if (options?.transaction) {
      queryOptions.transaction = options.transaction;
    }

    const editorial = await Editorial.findOne(queryOptions);
    return editorial || null;
  }

  /**
   * Busca una editorial por su ID único (UUID).
   * @param {string} id
   * @param {object} [options]
   * @returns {Promise<{ id: string, nombre: string, pais: string | null, creado_en: Date } | null>}
   */
  async findById(id, options = {}) {
    if (!id) return null;

    const editorial = await Editorial.findByPk(id, {
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });

    return editorial || null;
  }

  /**
   * Obtiene todas las editoriales ordenadas alfabéticamente.
   * @param {object} [options]
   * @returns {Promise<Array<{ id: string, nombre: string, pais: string | null, creado_en: Date }>>}
   */
  async findAll(options = {}) {
    return await Editorial.findAll({
      order: [['nombre', 'ASC']],
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });
  }

  /**
   * Crea una nueva editorial utilizando Sequelize.
   * @param {{ nombre: string, pais?: string }} data
   * @param {object} [options]
   */
  async create({ nombre, pais = null }, options = {}) {
    const cleanNombre = nombre.trim();
    const item = await Editorial.create(
      {
        nombre: cleanNombre,
        pais,
      },
      options && options.transaction ? { transaction: options.transaction } : {}
    );
    return item.get({ plain: true });
  }

  /**
   * Inserta o actualiza una editorial con Sequelize y conserva la transacción recibida.
   * Un savepoint permite recuperar un conflicto UNIQUE sin abortar la transacción externa.
   * @param {{ transaction?: import('sequelize').Transaction }} options
   * @param {{ nombre: string, pais?: string }} data
   * @returns {Promise<{ id: string, nombre: string, pais: string | null, creado_en: Date }>}
   */
  async upsert(options = {}, { nombre, pais = null }) {
    const cleanNombre = nombre.trim();
    const where = sequelize.where(
      sequelize.fn('LOWER', sequelize.col('nombre')),
      cleanNombre.toLowerCase()
    );
    const txOption = options.transaction ? { transaction: options.transaction } : {};
    let editorial = await Editorial.findOne({ where, ...txOption });

    if (editorial) {
      if (pais) {
        await editorial.update({ pais }, txOption);
      }
      return editorial.get({ plain: true });
    }

    try {
      editorial = options.transaction
        ? await sequelize.transaction({ transaction: options.transaction }, (savepoint) =>
          Editorial.create({ nombre: cleanNombre, pais }, { transaction: savepoint })
        )
        : await Editorial.create({ nombre: cleanNombre, pais });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError' &&
          (error.code || error.original?.code || error.parent?.code) !== '23505') {
        throw error;
      }
      editorial = await Editorial.findOne({ where, ...txOption });
      if (!editorial) throw error;
    }

    return editorial.get({ plain: true });
  }
}

module.exports = new EditorialRepository();

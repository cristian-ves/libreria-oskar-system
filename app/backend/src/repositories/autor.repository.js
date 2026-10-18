const { Autor, sequelize } = require('../models');

class AutorRepository {
  /**
   * Busca un autor por su nombre (búsqueda insensible a mayúsculas/minúsculas).
   * @param {string} nombre
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<{ id: string, nombre: string, biografia: string | null, creado_en: Date } | null>}
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

    const autor = await Autor.findOne(queryOptions);
    return autor || null;
  }

  /**
   * Busca un autor por su ID único (UUID).
   * @param {string} id
   * @param {object} [options]
   * @returns {Promise<{ id: string, nombre: string, biografia: string | null, creado_en: Date } | null>}
   */
  async findById(id, options = {}) {
    if (!id) return null;

    const autor = await Autor.findByPk(id, {
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });

    return autor || null;
  }

  /**
   * Obtiene todos los autores ordenados alfabéticamente.
   * @param {object} [options]
   * @returns {Promise<Array<{ id: string, nombre: string, biografia: string | null, creado_en: Date }>>}
   */
  async findAll(options = {}) {
    return await Autor.findAll({
      order: [['nombre', 'ASC']],
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });
  }

  /**
   * Crea un nuevo autor utilizando Sequelize.
   * @param {{ nombre: string, biografia?: string }} data
   * @param {object} [options]
   */
  async create({ nombre, biografia = null }, options = {}) {
    const cleanNombre = nombre.trim();
    const item = await Autor.create(
      {
        nombre: cleanNombre,
        biografia,
      },
      options && options.transaction ? { transaction: options.transaction } : {}
    );
    return item.get({ plain: true });
  }

  /**
   * Inserta o actualiza un autor utilizando Sequelize y conserva la transacción recibida.
   * Un savepoint permite recuperar un conflicto UNIQUE sin abortar la transacción externa.
   * @param {{ transaction?: import('sequelize').Transaction }} options
   * @param {{ nombre: string, biografia?: string }} data
   * @returns {Promise<{ id: string, nombre: string, biografia: string | null, creado_en: Date }>}
   */
  async upsert(options = {}, { nombre, biografia = null }) {
    const cleanNombre = nombre.trim();
    const where = sequelize.where(
      sequelize.fn('LOWER', sequelize.col('nombre')),
      cleanNombre.toLowerCase()
    );
    const txOption = options.transaction ? { transaction: options.transaction } : {};
    let autor = await Autor.findOne({ where, ...txOption });

    if (autor) {
      if (biografia) {
        await autor.update({ biografia }, txOption);
      }
      return autor.get({ plain: true });
    }

    try {
      autor = options.transaction
        ? await sequelize.transaction({ transaction: options.transaction }, (savepoint) =>
          Autor.create({ nombre: cleanNombre, biografia }, { transaction: savepoint })
        )
        : await Autor.create({ nombre: cleanNombre, biografia });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError' &&
          (error.code || error.original?.code || error.parent?.code) !== '23505') {
        throw error;
      }
      autor = await Autor.findOne({ where, ...txOption });
      if (!autor) throw error;
    }

    return autor.get({ plain: true });
  }
}

module.exports = new AutorRepository();

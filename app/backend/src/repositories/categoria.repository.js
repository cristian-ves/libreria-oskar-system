const { Categoria, sequelize } = require('../models');

class CategoriaRepository {
  /**
   * Obtiene todas las categorías temáticas ordenadas alfabéticamente por nombre.
   * @param {object | import('pg').PoolClient} [options] - Opciones de consulta o cliente pg heredado.
   * @returns {Promise<Array<{ id: string, nombre: string }>>}
   */
  async findAll(options = {}) {
    // Si se pasa un cliente pg heredado con .query
    if (options && typeof options.query === 'function') {
      const text = `
        SELECT id, nombre
        FROM categorias
        ORDER BY nombre ASC;
      `;
      const res = await options.query(text);
      return res.rows;
    }

    const queryOptions = {
      attributes: ['id', 'nombre'],
      order: [['nombre', 'ASC']],
      raw: true,
    };

    if (options && options.transaction) {
      queryOptions.transaction = options.transaction;
    }

    return await Categoria.findAll(queryOptions);
  }

  /**
   * Busca una categoría por su ID único (UUID).
   * @param {string} id
   * @param {object} [options]
   * @returns {Promise<{ id: string, nombre: string, creado_en: Date } | null>}
   */
  async findById(id, options = {}) {
    if (!id) return null;

    if (options && typeof options.query === 'function') {
      const res = await options.query('SELECT id, nombre, creado_en FROM categorias WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] || null;
    }

    const item = await Categoria.findByPk(id, {
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });

    return item || null;
  }

  /**
   * Busca una categoría por su nombre exacto (case insensitive).
   * @param {string} nombre
   * @param {object} [options]
   * @returns {Promise<{ id: string, nombre: string, creado_en: Date } | null>}
   */
  async findByNombre(nombre, options = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) return null;

    const cleanNombre = nombre.trim();

    if (options && typeof options.query === 'function') {
      const res = await options.query('SELECT id, nombre, creado_en FROM categorias WHERE LOWER(nombre) = LOWER($1) LIMIT 1;', [cleanNombre]);
      return res.rows[0] || null;
    }

    const item = await Categoria.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      raw: true,
      ...(options && options.transaction ? { transaction: options.transaction } : {}),
    });

    return item || null;
  }

  /**
   * Crea una nueva categoría utilizando Sequelize.
   * @param {{ nombre: string }} data
   * @param {object} [options]
   */
  async create({ nombre }, options = {}) {
    const item = await Categoria.create(
      { nombre: nombre.trim() },
      options && options.transaction ? { transaction: options.transaction } : {}
    );
    return item.get({ plain: true });
  }
}

module.exports = new CategoriaRepository();

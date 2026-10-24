const { Categoria, Libro, sequelize } = require('../models');

class CategoriaRepository {
  /**
   * Obtiene todas las categorías temáticas ordenadas alfabéticamente por nombre.
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Array<{ id: string, nombre: string }>>}
  */
  async findAll(options = {}) {
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

  async findAllWithLibroCount() {
    const rows = await Categoria.findAll({
      attributes: [
        'id',
        'nombre',
        [sequelize.fn('COUNT', sequelize.col('libros.id')), 'libros_count'],
      ],
      include: [{ model: Libro, as: 'libros', attributes: [], required: false }],
      group: ['Categoria.id'],
      order: [['nombre', 'ASC']],
      raw: true,
    });

    return rows.map((row) => ({ ...row, libros_count: Number(row.libros_count) }));
  }

  /**
   * Busca una categoría por su ID único (UUID).
   * @param {string} id
   * @param {object} [options]
   * @returns {Promise<{ id: string, nombre: string, creado_en: Date } | null>}
   */
  async findById(id, options = {}) {
    if (!id) return null;

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

  async updateNombre(id, nombre, options = {}) {
    const [updated] = await Categoria.update(
      { nombre },
      { where: { id }, returning: true, ...(options.transaction ? { transaction: options.transaction } : {}) }
    );
    return updated ? Categoria.findByPk(id, { raw: true, ...(options.transaction ? { transaction: options.transaction } : {}) }) : null;
  }

  async countLibros(id, options = {}) {
    return Libro.count({
      where: { categoria_id: id },
      ...(options.transaction ? { transaction: options.transaction } : {}),
    });
  }

  async delete(id, options = {}) {
    return Categoria.destroy({
      where: { id },
      ...(options.transaction ? { transaction: options.transaction } : {}),
    });
  }
}

module.exports = new CategoriaRepository();

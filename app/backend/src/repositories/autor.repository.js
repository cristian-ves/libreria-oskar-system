const { Autor, sequelize } = require('../models');

class AutorRepository {
  /**
   * Busca un autor por su nombre (búsqueda insensible a mayúsculas/minúsculas).
   * @param {string} nombre
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<{ id: string, nombre: string, biografia: string | null, creado_en: Date } | null>}
   */
  async findByNombre(nombre, executorOrOptions = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return null;
    }

    const cleanNombre = nombre.trim();

    // Compatibilidad con transacciones directas existentes de pg
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        SELECT id, nombre, biografia, creado_en
        FROM autores
        WHERE LOWER(nombre) = LOWER($1)
        LIMIT 1;
      `;
      const res = await executorOrOptions.query(text, [cleanNombre]);
      return res.rows[0] || null;
    }

    const queryOptions = {
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      raw: true,
    };

    if (executorOrOptions && executorOrOptions.transaction) {
      queryOptions.transaction = executorOrOptions.transaction;
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

    if (options && typeof options.query === 'function') {
      const res = await options.query('SELECT id, nombre, biografia, creado_en FROM autores WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] || null;
    }

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
   * Inserta o actualiza un autor usando ON CONFLICT o Sequelize upsert.
   * NOTA TRANSACCIONAL: Si el parámetro executorOrOptions es un cliente pg.PoolClient proveniente
   * de una transacción activa en db.withTransaction (ej. en libro.service.js), se delega a
   * dicho cliente para preservar la atomicidad ACID hasta que el servicio sea migrado a Sequelize.
   * 
   * @param {import('pg').PoolClient | object} executorOrOptions
   * @param {{ nombre: string, biografia?: string }} data
   * @returns {Promise<{ id: string, nombre: string, biografia: string | null, creado_en: Date }>}
   */
  async upsert(executorOrOptions, { nombre, biografia = null }) {
    const cleanNombre = nombre.trim();

    // 1. Delegación transaccional segura si participa en transacción existente con pg client
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        INSERT INTO autores (nombre, biografia)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO UPDATE
          SET biografia = COALESCE(EXCLUDED.biografia, autores.biografia)
        RETURNING id, nombre, biografia, creado_en;
      `;
      const res = await executorOrOptions.query(text, [cleanNombre, biografia]);
      return res.rows[0];
    }

    // 2. Operación con Sequelize ORM
    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    let autor = await Autor.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      ...txOption,
    });

    if (autor) {
      if (biografia) {
        await autor.update({ biografia }, txOption);
      }
      return autor.get({ plain: true });
    }

    const nuevoAutor = await Autor.create(
      {
        nombre: cleanNombre,
        biografia,
      },
      txOption
    );

    return nuevoAutor.get({ plain: true });
  }
}

module.exports = new AutorRepository();

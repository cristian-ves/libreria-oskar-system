const { Editorial, sequelize } = require('../models');

class EditorialRepository {
  /**
   * Busca una editorial por su nombre (búsqueda insensible a mayúsculas/minúsculas).
   * @param {string} nombre
   * @param {object | import('pg').PoolClient} [executorOrOptions]
   * @returns {Promise<{ id: string, nombre: string, pais: string | null, creado_en: Date } | null>}
   */
  async findByNombre(nombre, executorOrOptions = {}) {
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return null;
    }

    const cleanNombre = nombre.trim();

    // Compatibilidad con transacciones directas existentes de pg
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        SELECT id, nombre, pais, creado_en
        FROM editoriales
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

    if (options && typeof options.query === 'function') {
      const res = await options.query('SELECT id, nombre, pais, creado_en FROM editoriales WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] || null;
    }

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
   * Inserta o actualiza una editorial con ON CONFLICT o Sequelize upsert.
   * NOTA TRANSACCIONAL: Si el parámetro executorOrOptions es un cliente pg.PoolClient proveniente
   * de una transacción activa en db.withTransaction (ej. en libro.service.js), se delega a
   * dicho cliente para preservar la atomicidad ACID hasta que el servicio sea migrado a Sequelize.
   * 
   * @param {import('pg').PoolClient | object} executorOrOptions
   * @param {{ nombre: string, pais?: string }} data
   * @returns {Promise<{ id: string, nombre: string, pais: string | null, creado_en: Date }>}
   */
  async upsert(executorOrOptions, { nombre, pais = null }) {
    const cleanNombre = nombre.trim();

    // 1. Delegación transaccional segura si participa en transacción existente con pg client
    if (executorOrOptions && typeof executorOrOptions.query === 'function') {
      const text = `
        INSERT INTO editoriales (nombre, pais)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO UPDATE
          SET pais = COALESCE(EXCLUDED.pais, editoriales.pais)
        RETURNING id, nombre, pais, creado_en;
      `;
      const res = await executorOrOptions.query(text, [cleanNombre, pais]);
      return res.rows[0];
    }

    // 2. Operación con Sequelize ORM
    const txOption = (executorOrOptions && executorOrOptions.transaction)
      ? { transaction: executorOrOptions.transaction }
      : {};

    let editorial = await Editorial.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('nombre')),
        cleanNombre.toLowerCase()
      ),
      ...txOption,
    });

    if (editorial) {
      if (pais) {
        await editorial.update({ pais }, txOption);
      }
      return editorial.get({ plain: true });
    }

    const nuevaEditorial = await Editorial.create(
      {
        nombre: cleanNombre,
        pais,
      },
      txOption
    );

    return nuevaEditorial.get({ plain: true });
  }
}

module.exports = new EditorialRepository();

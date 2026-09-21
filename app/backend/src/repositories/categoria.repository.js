const db = require('../config/db');

class CategoriaRepository {
  /**
   * Obtiene todas las categorías temáticas ordenadas alfabéticamente por nombre.
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   * @returns {Promise<Array<{ id: string, nombre: string }>>}
   */
  async findAll(executor = db.pool) {
    const text = `
      SELECT id, nombre
      FROM categorias
      ORDER BY nombre ASC;
    `;
    const res = await executor.query(text);
    return res.rows;
  }
}

module.exports = new CategoriaRepository();

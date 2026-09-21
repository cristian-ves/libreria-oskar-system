const db = require('../config/db');

class EditorialRepository {
  /**
   * Busca una editorial por su nombre.
   * @param {string} nombre
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findByNombre(nombre, executor = db.pool) {
    const text = `
      SELECT id, nombre, pais, creado_en
      FROM editoriales
      WHERE LOWER(nombre) = LOWER($1)
      LIMIT 1;
    `;
    const res = await executor.query(text, [nombre.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Inserta o actualiza una editorial con ON CONFLICT por nombre.
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {{ nombre: string, pais?: string }} data
   */
  async upsert(executor, { nombre, pais = null }) {
    const text = `
      INSERT INTO editoriales (nombre, pais)
      VALUES ($1, $2)
      ON CONFLICT (nombre) DO UPDATE
        SET pais = COALESCE(EXCLUDED.pais, editoriales.pais)
      RETURNING id, nombre, pais, creado_en;
    `;
    const res = await executor.query(text, [nombre.trim(), pais]);
    return res.rows[0];
  }
}

module.exports = new EditorialRepository();

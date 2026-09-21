const db = require('../config/db');

class AutorRepository {
  /**
   * Busca un autor por su nombre.
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   * @param {string} nombre
   */
  async findByNombre(nombre, executor = db.pool) {
    const text = `
      SELECT id, nombre, biografia, creado_en
      FROM autores
      WHERE LOWER(nombre) = LOWER($1)
      LIMIT 1;
    `;
    const res = await executor.query(text, [nombre.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Inserta o actualiza un autor usando ON CONFLICT para evitar duplicidad.
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {{ nombre: string, biografia?: string }} data
   */
  async upsert(executor, { nombre, biografia = null }) {
    const text = `
      INSERT INTO autores (nombre, biografia)
      VALUES ($1, $2)
      ON CONFLICT (nombre) DO UPDATE
        SET biografia = COALESCE(EXCLUDED.biografia, autores.biografia)
      RETURNING id, nombre, biografia, creado_en;
    `;
    const res = await executor.query(text, [nombre.trim(), biografia]);
    return res.rows[0];
  }
}

module.exports = new AutorRepository();

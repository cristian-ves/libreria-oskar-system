const db = require('../config/db');

class UsuarioRepository {
  /**
   * Busca un usuario por su dirección de correo electrónico, incluyendo el nombre de su rol.
   * @param {string} email
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, executor = db.pool) {
    const text = `
      SELECT 
        u.id,
        u.rol_id,
        u.nombre_completo,
        u.email,
        u.password_hash,
        u.dos_factores_activo,
        u.activo,
        u.creado_en,
        u.actualizado_en,
        r.nombre AS rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1;
    `;
    const res = await executor.query(text, [email.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Busca un usuario por su identificador único (UUID), incluyendo el nombre de su rol.
   * @param {string} id
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   * @returns {Promise<Object|null>}
   */
  async findById(id, executor = db.pool) {
    const text = `
      SELECT 
        u.id,
        u.rol_id,
        u.nombre_completo,
        u.email,
        u.password_hash,
        u.dos_factores_activo,
        u.activo,
        u.creado_en,
        u.actualizado_en,
        r.nombre AS rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
      LIMIT 1;
    `;
    const res = await executor.query(text, [id]);
    return res.rows[0] || null;
  }
}

module.exports = new UsuarioRepository();

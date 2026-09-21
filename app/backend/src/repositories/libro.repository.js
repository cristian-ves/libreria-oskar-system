const db = require('../config/db');

class LibroRepository {
  /**
   * Busca un libro por su código ISBN incluyendo nombres de autor y editorial.
   * @param {string} isbn
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findByIsbn(isbn, executor = db.pool) {
    const text = `
      SELECT 
        l.id,
        l.titulo,
        l.isbn,
        l.resena,
        l.imagen_url,
        l.precio,
        l.activo,
        l.creado_en,
        l.actualizado_en,
        l.autor_id,
        a.nombre AS autor_nombre,
        l.editorial_id,
        e.nombre AS editorial_nombre
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      WHERE l.isbn = $1
      LIMIT 1;
    `;
    const res = await executor.query(text, [isbn.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Busca un libro por su ID único (UUID).
   * @param {string} id
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findById(id, executor = db.pool) {
    const text = `
      SELECT 
        l.id,
        l.titulo,
        l.isbn,
        l.resena,
        l.imagen_url,
        l.precio,
        l.activo,
        l.creado_en,
        l.actualizado_en,
        l.autor_id,
        a.nombre AS autor_nombre,
        l.editorial_id,
        e.nombre AS editorial_nombre
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      WHERE l.id = $1
      LIMIT 1;
    `;
    const res = await executor.query(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Registra o actualiza un libro atómicamente utilizando ON CONFLICT (isbn).
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {{
   *   autor_id?: string,
   *   editorial_id?: string,
   *   titulo: string,
   *   isbn: string,
   *   resena: string,
   *   imagen_url?: string,
   *   precio?: number,
   *   activo?: boolean
   * }} data
   */
  async upsert(executor, data) {
    const {
      autor_id = null,
      editorial_id = null,
      titulo,
      isbn,
      resena,
      imagen_url = null,
      precio = 0.00,
      activo = true,
    } = data;

    const text = `
      INSERT INTO libros (
        autor_id,
        editorial_id,
        titulo,
        isbn,
        resena,
        imagen_url,
        precio,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (isbn) DO UPDATE
        SET titulo = EXCLUDED.titulo,
            autor_id = COALESCE(EXCLUDED.autor_id, libros.autor_id),
            editorial_id = COALESCE(EXCLUDED.editorial_id, libros.editorial_id),
            resena = COALESCE(EXCLUDED.resena, libros.resena),
            imagen_url = COALESCE(EXCLUDED.imagen_url, libros.imagen_url),
            actualizado_en = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      autor_id,
      editorial_id,
      titulo.trim(),
      isbn.trim(),
      resena.trim(),
      imagen_url,
      parseFloat(precio) || 0.00,
      activo,
    ];

    const res = await executor.query(text, values);
    return res.rows[0];
  }

  /**
   * Lista y busca libros en el catálogo con filtro opcional por título, autor o ISBN.
   * @param {string} [queryStr]
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async searchAndList(queryStr = '', executor = db.pool) {
    let text = `
      SELECT 
        l.id,
        l.titulo,
        l.isbn,
        l.resena,
        l.imagen_url,
        l.precio,
        l.activo,
        l.creado_en,
        a.nombre AS autor_nombre,
        e.nombre AS editorial_nombre,
        COALESCE(SUM(inv.stock_actual), 0) AS stock_total
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      LEFT JOIN inventarios inv ON inv.libro_id = l.id
    `;
    const params = [];

    if (queryStr && queryStr.trim()) {
      text += `
        WHERE LOWER(l.titulo) LIKE LOWER($1) 
           OR LOWER(a.nombre) LIKE LOWER($1) 
           OR l.isbn LIKE $1
      `;
      params.push(`%${queryStr.trim()}%`);
    }

    text += `
      GROUP BY l.id, a.nombre, e.nombre
      ORDER BY l.creado_en DESC
      LIMIT 50;
    `;

    const res = await executor.query(text, params);
    return res.rows;
  }
}

module.exports = new LibroRepository();

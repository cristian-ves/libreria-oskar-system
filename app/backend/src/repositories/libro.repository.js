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
        e.nombre AS editorial_nombre,
        l.categoria_id,
        c.nombre AS categoria_nombre
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
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
        e.nombre AS editorial_nombre,
        l.categoria_id,
        c.nombre AS categoria_nombre
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
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
   *   categoria_id?: string,
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
      categoria_id = null,
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
        categoria_id,
        titulo,
        isbn,
        resena,
        imagen_url,
        precio,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (isbn) DO UPDATE
        SET titulo = EXCLUDED.titulo,
            autor_id = COALESCE(EXCLUDED.autor_id, libros.autor_id),
            editorial_id = COALESCE(EXCLUDED.editorial_id, libros.editorial_id),
            categoria_id = COALESCE(EXCLUDED.categoria_id, libros.categoria_id),
            resena = COALESCE(EXCLUDED.resena, libros.resena),
            imagen_url = COALESCE(EXCLUDED.imagen_url, libros.imagen_url),
            actualizado_en = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      autor_id,
      editorial_id,
      categoria_id,
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
   * Inserta un libro nuevo sin ON CONFLICT (para registros manuales donde isbn puede ser null).
   * @param {import('pg').PoolClient | import('pg').Pool} executor
   * @param {{
   *   autor_id?: string,
   *   editorial_id?: string,
   *   categoria_id?: string,
   *   titulo: string,
   *   isbn?: string,
   *   resena: string,
   *   imagen_url?: string,
   *   precio?: number,
   *   activo?: boolean
   * }} data
   */
  async create(executor, data) {
    const {
      autor_id = null,
      editorial_id = null,
      categoria_id = null,
      titulo,
      isbn = null,
      resena,
      imagen_url = null,
      precio = 0.00,
      activo = true,
    } = data;

    const text = `
      INSERT INTO libros (
        autor_id,
        editorial_id,
        categoria_id,
        titulo,
        isbn,
        resena,
        imagen_url,
        precio,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      autor_id,
      editorial_id,
      categoria_id,
      titulo.trim(),
      isbn ? isbn.trim() : null,
      resena.trim(),
      imagen_url || null,
      parseFloat(precio) || 0.00,
      activo,
    ];

    const res = await executor.query(text, values);
    return res.rows[0];
  }

  /**
   * Lista y busca libros en el catálogo con filtro opcional por término y/o categoría.
   * @param {string} [queryStr]
   * @param {string} [categoriaId]
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async searchAndList(queryStr = '', categoriaId = null, executor = db.pool) {
    let exec = executor;
    let catId = categoriaId;

    if (categoriaId && typeof categoriaId.query === 'function') {
      exec = categoriaId;
      catId = null;
    }

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
        l.autor_id,
        a.nombre AS autor_nombre,
        l.editorial_id,
        e.nombre AS editorial_nombre,
        l.categoria_id,
        c.nombre AS categoria_nombre,
        COALESCE(SUM(inv.stock_actual), 0) AS stock_total
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
      LEFT JOIN inventarios inv ON inv.libro_id = l.id
    `;
    const params = [];
    const whereConditions = [];

    if (queryStr && typeof queryStr === 'string' && queryStr.trim()) {
      params.push(`%${queryStr.trim()}%`);
      whereConditions.push(`(
        LOWER(l.titulo) LIKE LOWER($${params.length}) 
        OR LOWER(a.nombre) LIKE LOWER($${params.length}) 
        OR l.isbn LIKE $${params.length}
      )`);
    }

    if (catId && typeof catId === 'string' && catId.trim()) {
      params.push(catId.trim());
      whereConditions.push(`l.categoria_id = $${params.length}`);
    }

    if (whereConditions.length > 0) {
      text += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    text += `
      GROUP BY l.id, a.nombre, e.nombre, c.nombre
      ORDER BY l.creado_en DESC
      LIMIT 50;
    `;

    const res = await exec.query(text, params);
    return res.rows;
  }

  /**
   * Busca el detalle completo y disponibilidad de un libro por su parsed ref ({ id } o { shortId }).
   * Solo incluye libros activos y bodegas/sucursales activas.
   *
   * @param {{ id?: string, shortId?: string }} parsed
   * @param {import('pg').PoolClient | import('pg').Pool} [executor]
   */
  async findDetalleByRef(parsed, executor = db.pool) {
    if (!parsed || (!parsed.id && !parsed.shortId)) {
      return null;
    }

    let whereCondition = '';
    const params = [];

    if (parsed.id) {
      params.push(parsed.id);
      whereCondition = `l.id = $${params.length}`;
    } else if (parsed.shortId) {
      const s = parsed.shortId.toLowerCase();
      const lower = `${s.slice(0, 8)}-${s.slice(8, 12)}-0000-0000-000000000000`;
      const upper = `${s.slice(0, 8)}-${s.slice(8, 12)}-ffff-ffff-ffffffffffff`;
      params.push(lower, upper);
      whereCondition = `l.id BETWEEN $1::uuid AND $2::uuid`;
    }

    const libroQuery = `
      SELECT 
        l.id,
        l.titulo,
        l.isbn,
        l.resena,
        l.imagen_url,
        l.precio,
        l.creado_en,
        a.nombre AS autor_nombre,
        e.nombre AS editorial_nombre,
        l.categoria_id,
        c.nombre AS categoria_nombre
      FROM libros l
      LEFT JOIN autores a ON l.autor_id = a.id
      LEFT JOIN editoriales e ON l.editorial_id = e.id
      LEFT JOIN categorias c ON l.categoria_id = c.id
      WHERE l.activo = true AND ${whereCondition}
      ORDER BY l.creado_en ASC
      LIMIT 1;
    `;

    const libroRes = await executor.query(libroQuery, params);
    if (libroRes.rowCount === 0) {
      return null;
    }

    const libro = libroRes.rows[0];

    const dispQuery = `
      SELECT 
        s.nombre AS sucursal_nombre,
        s.direccion AS sucursal_direccion,
        s.telefono AS sucursal_telefono,
        b.nombre AS bodega_nombre,
        inv.stock_actual
      FROM inventarios inv
      JOIN bodegas b ON inv.bodega_id = b.id
      JOIN sucursales s ON b.sucursal_id = s.id
      WHERE inv.libro_id = $1
        AND b.activo = true
        AND s.activo = true
      ORDER BY s.nombre ASC, b.nombre ASC;
    `;

    const dispRes = await executor.query(dispQuery, [libro.id]);
    const disponibilidad = dispRes.rows.map((row) => ({
      sucursal_nombre: row.sucursal_nombre,
      sucursal_direccion: row.sucursal_direccion,
      sucursal_telefono: row.sucursal_telefono,
      bodega_nombre: row.bodega_nombre,
      stock_actual: Number(row.stock_actual) || 0,
    }));

    const stock_total = disponibilidad.reduce((acc, curr) => acc + curr.stock_actual, 0);

    return {
      ...libro,
      disponibilidad,
      stock_total,
    };
  }
}

module.exports = new LibroRepository();

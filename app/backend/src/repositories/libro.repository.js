const db = require('../config/db');
const { Libro, Autor, Editorial, Categoria, Inventario, Bodega, Sucursal, Sequelize } = require('../models');

const { Op } = Sequelize;

const LIBRO_ATTRIBUTES = [
  'id', 'titulo', 'isbn', 'resena', 'imagen_url', 'precio', 'activo', 'creado_en',
  'actualizado_en', 'autor_id', 'editorial_id', 'categoria_id',
];

function isPgExecutor(value) {
  return Boolean(value && typeof value.query === 'function');
}

function transactionOption(value) {
  return value && value.transaction ? { transaction: value.transaction } : {};
}

function libroPlano(libro) {
  if (!libro) return null;
  const plain = libro.get ? libro.get({ plain: true }) : libro;
  const { autor, editorial, categoria, ...fields } = plain;
  return {
    ...fields,
    autor_nombre: autor?.nombre ?? null,
    editorial_nombre: editorial?.nombre ?? null,
    categoria_nombre: categoria?.nombre ?? null,
  };
}

class LibroRepository {
  async findByIsbn(isbn, executorOrOptions = {}) {
    const cleanIsbn = typeof isbn === 'string' ? isbn.trim() : isbn;
    if (isPgExecutor(executorOrOptions)) {
      const res = await executorOrOptions.query(`
        SELECT l.id, l.titulo, l.isbn, l.resena, l.imagen_url, l.precio, l.activo,
               l.creado_en, l.actualizado_en, l.autor_id, a.nombre AS autor_nombre,
               l.editorial_id, e.nombre AS editorial_nombre,
               l.categoria_id, c.nombre AS categoria_nombre
        FROM libros l
        LEFT JOIN autores a ON l.autor_id = a.id
        LEFT JOIN editoriales e ON l.editorial_id = e.id
        LEFT JOIN categorias c ON l.categoria_id = c.id
        WHERE l.isbn = $1 LIMIT 1;`, [cleanIsbn]);
      return res.rows[0] || null;
    }

    const libro = await Libro.findOne({
      where: { isbn: cleanIsbn },
      attributes: LIBRO_ATTRIBUTES,
      include: [
        { model: Autor, as: 'autor', attributes: ['nombre'], required: false },
        { model: Editorial, as: 'editorial', attributes: ['nombre'], required: false },
        { model: Categoria, as: 'categoria', attributes: ['nombre'], required: false },
      ],
      ...transactionOption(executorOrOptions),
    });
    return libroPlano(libro);
  }

  async findById(id, executorOrOptions = {}) {
    if (isPgExecutor(executorOrOptions)) {
      const res = await executorOrOptions.query(`
        SELECT l.id, l.titulo, l.isbn, l.resena, l.imagen_url, l.precio, l.activo,
               l.creado_en, l.actualizado_en, l.autor_id, a.nombre AS autor_nombre,
               l.editorial_id, e.nombre AS editorial_nombre,
               l.categoria_id, c.nombre AS categoria_nombre
        FROM libros l
        LEFT JOIN autores a ON l.autor_id = a.id
        LEFT JOIN editoriales e ON l.editorial_id = e.id
        LEFT JOIN categorias c ON l.categoria_id = c.id
        WHERE l.id = $1 LIMIT 1;`, [id]);
      return res.rows[0] || null;
    }

    const libro = await Libro.findByPk(id, {
      attributes: LIBRO_ATTRIBUTES,
      include: [
        { model: Autor, as: 'autor', attributes: ['nombre'], required: false },
        { model: Editorial, as: 'editorial', attributes: ['nombre'], required: false },
        { model: Categoria, as: 'categoria', attributes: ['nombre'], required: false },
      ],
      ...transactionOption(executorOrOptions),
    });
    return libroPlano(libro);
  }

  async upsert(executorOrOptions, data) {
    const {
      autor_id = null, editorial_id = null, categoria_id = null,
      titulo, isbn, resena, imagen_url = null, precio = 0.00, activo = true,
    } = data;
    const values = [
      autor_id, editorial_id, categoria_id, titulo.trim(), isbn.trim(), resena.trim(),
      imagen_url, parseFloat(precio) || 0.00, activo,
    ];

    // Mantener la unidad atómica del servicio hasta migrarlo desde PoolClient.
    if (isPgExecutor(executorOrOptions)) {
      const res = await executorOrOptions.query(`
        INSERT INTO libros (autor_id, editorial_id, categoria_id, titulo, isbn, resena, imagen_url, precio, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (isbn) DO UPDATE
          SET titulo = EXCLUDED.titulo,
              autor_id = COALESCE(EXCLUDED.autor_id, libros.autor_id),
              editorial_id = COALESCE(EXCLUDED.editorial_id, libros.editorial_id),
              categoria_id = COALESCE(EXCLUDED.categoria_id, libros.categoria_id),
              resena = COALESCE(EXCLUDED.resena, libros.resena),
              imagen_url = COALESCE(EXCLUDED.imagen_url, libros.imagen_url),
              actualizado_en = CURRENT_TIMESTAMP
        RETURNING *;`, values);
      return res.rows[0];
    }

    const options = transactionOption(executorOrOptions);
    const createValues = {
      autor_id, editorial_id, categoria_id, titulo: values[3], isbn: values[4],
      resena: values[5], imagen_url, precio: values[7], activo,
    };

    // findOrCreate handles UNIQUE(isbn) races (including a savepoint when called
    // inside a caller-owned Sequelize transaction). Apply only the fields that
    // the former ON CONFLICT clause updated; price and activo stay unchanged.
    const [libro, created] = await Libro.findOrCreate({
      where: { isbn: values[4] },
      defaults: createValues,
      ...options,
    });
    if (!created) {
      const updates = { titulo: values[3] };
      if (autor_id !== null && autor_id !== undefined) updates.autor_id = autor_id;
      if (editorial_id !== null && editorial_id !== undefined) updates.editorial_id = editorial_id;
      if (categoria_id !== null && categoria_id !== undefined) updates.categoria_id = categoria_id;
      if (resena !== null && resena !== undefined) updates.resena = resena.trim();
      if (imagen_url !== null && imagen_url !== undefined) updates.imagen_url = imagen_url;
      await libro.update(updates, options);
    }
    return libro.get({ plain: true });
  }

  async create(executorOrOptions, data) {
    const {
      autor_id = null, editorial_id = null, categoria_id = null,
      titulo, isbn = null, resena, imagen_url = null, precio = 0.00, activo = true,
    } = data;
    const values = [
      autor_id, editorial_id, categoria_id, titulo.trim(), isbn ? isbn.trim() : null,
      resena.trim(), imagen_url || null, parseFloat(precio) || 0.00, activo,
    ];
    if (isPgExecutor(executorOrOptions)) {
      const res = await executorOrOptions.query(`
        INSERT INTO libros (autor_id, editorial_id, categoria_id, titulo, isbn, resena, imagen_url, precio, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`, values);
      return res.rows[0];
    }

    try {
      const libro = await Libro.create({
        autor_id, editorial_id, categoria_id, titulo: values[3], isbn: values[4],
        resena: values[5], imagen_url: values[6], precio: values[7], activo,
      }, transactionOption(executorOrOptions));
      return libro.get({ plain: true });
    } catch (error) {
      // Conservar el código PostgreSQL que el servicio actual traduce a HTTP 409.
      if (error.name === 'SequelizeUniqueConstraintError' && !error.code) {
        error.code = error.original?.code || '23505';
      }
      throw error;
    }
  }

  async searchAndList(queryStr = '', categoriaId = null, executorOrOptions = {}) {
    let optionsOrExecutor = executorOrOptions;
    let catId = categoriaId;
    if (isPgExecutor(categoriaId)) {
      optionsOrExecutor = categoriaId;
      catId = null;
    }

    if (isPgExecutor(optionsOrExecutor)) {
      let text = `
        SELECT l.id, l.titulo, l.isbn, l.resena, l.imagen_url, l.precio, l.activo,
               l.creado_en, l.autor_id, a.nombre AS autor_nombre,
               l.editorial_id, e.nombre AS editorial_nombre,
               l.categoria_id, c.nombre AS categoria_nombre,
               COALESCE(SUM(inv.stock_actual), 0) AS stock_total
        FROM libros l
        LEFT JOIN autores a ON l.autor_id = a.id
        LEFT JOIN editoriales e ON l.editorial_id = e.id
        LEFT JOIN categorias c ON l.categoria_id = c.id
        LEFT JOIN inventarios inv ON inv.libro_id = l.id`;
      const params = [];
      const conditions = [];
      if (queryStr && typeof queryStr === 'string' && queryStr.trim()) {
        params.push(`%${queryStr.trim()}%`);
        conditions.push(`(LOWER(l.titulo) LIKE LOWER($${params.length}) OR LOWER(a.nombre) LIKE LOWER($${params.length}) OR l.isbn LIKE $${params.length})`);
      }
      if (catId && typeof catId === 'string' && catId.trim()) {
        params.push(catId.trim());
        conditions.push(`l.categoria_id = $${params.length}`);
      }
      if (conditions.length) text += ` WHERE ${conditions.join(' AND ')}`;
      text += ' GROUP BY l.id, a.nombre, e.nombre, c.nombre ORDER BY l.creado_en DESC LIMIT 50;';
      const res = await optionsOrExecutor.query(text, params);
      return res.rows;
    }

    const where = {};
    if (catId && typeof catId === 'string' && catId.trim()) where.categoria_id = catId.trim();
    const term = typeof queryStr === 'string' ? queryStr.trim() : '';
    const include = [
      { model: Autor, as: 'autor', attributes: ['id', 'nombre'], required: false },
      { model: Editorial, as: 'editorial', attributes: ['id', 'nombre'], required: false },
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], required: false },
      { model: Inventario, as: 'inventarios', attributes: [], required: false },
    ];
    const queryOptions = {
      where,
      attributes: [
        'id', 'titulo', 'isbn', 'resena', 'imagen_url', 'precio', 'activo', 'creado_en',
        'autor_id', 'editorial_id', 'categoria_id',
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('inventarios.stock_actual')), 0), 'stock_total'],
      ],
      include,
      group: ['Libro.id', 'autor.id', 'editorial.id', 'categoria.id'],
      order: [['creado_en', 'DESC']],
      limit: 50,
      raw: true,
      nest: true,
      subQuery: false,
      ...transactionOption(optionsOrExecutor),
    };
    if (term) {
      queryOptions.where = {
        ...where,
        [Op.or]: [
          { titulo: { [Op.iLike]: `%${term}%` } },
          { '$autor.nombre$': { [Op.iLike]: `%${term}%` } },
          { isbn: { [Op.like]: `%${term}%` } },
        ],
      };
    }

    const rows = await Libro.findAll(queryOptions);
    return rows.map((row) => {
      const { autor, editorial, categoria, ...fields } = row;
      return {
      ...fields,
      autor_nombre: row.autor?.nombre ?? null,
      editorial_nombre: row.editorial?.nombre ?? null,
      categoria_nombre: row.categoria?.nombre ?? null,
      stock_total: Number(row.stock_total) || 0,
      };
    });
  }

  async findDetalleByRef(parsed, executorOrOptions = {}) {
    if (!parsed || (!parsed.id && !parsed.shortId)) return null;
    let where;
    if (parsed.id) {
      where = { id: parsed.id };
    } else if (parsed.shortId) {
      const short = parsed.shortId.toLowerCase();
      const lower = `${short.slice(0, 8)}-${short.slice(8, 12)}-0000-0000-000000000000`;
      const upper = `${short.slice(0, 8)}-${short.slice(8, 12)}-ffff-ffff-ffffffffffff`;
      where = { id: { [Op.between]: [lower, upper] } };
    } else {
      return null;
    }

    if (isPgExecutor(executorOrOptions)) {
      const params = parsed.id ? [parsed.id] : [
        `${parsed.shortId.toLowerCase().slice(0, 8)}-${parsed.shortId.toLowerCase().slice(8, 12)}-0000-0000-000000000000`,
        `${parsed.shortId.toLowerCase().slice(0, 8)}-${parsed.shortId.toLowerCase().slice(8, 12)}-ffff-ffff-ffffffffffff`,
      ];
      const condition = parsed.id ? 'l.id = $1' : 'l.id BETWEEN $1::uuid AND $2::uuid';
      const libroRes = await executorOrOptions.query(`
        SELECT l.id, l.titulo, l.isbn, l.resena, l.imagen_url, l.precio, l.creado_en,
               a.nombre AS autor_nombre, e.nombre AS editorial_nombre,
               l.categoria_id, c.nombre AS categoria_nombre
        FROM libros l
        LEFT JOIN autores a ON l.autor_id = a.id
        LEFT JOIN editoriales e ON l.editorial_id = e.id
        LEFT JOIN categorias c ON l.categoria_id = c.id
        WHERE l.activo = true AND ${condition} ORDER BY l.creado_en ASC LIMIT 1;`, params);
      if (!libroRes.rowCount) return null;
      const libro = libroRes.rows[0];
      const dispRes = await executorOrOptions.query(`
        SELECT s.nombre AS sucursal_nombre, s.direccion AS sucursal_direccion,
               s.telefono AS sucursal_telefono, b.nombre AS bodega_nombre, inv.stock_actual
        FROM inventarios inv
        JOIN bodegas b ON inv.bodega_id = b.id
        JOIN sucursales s ON b.sucursal_id = s.id
        WHERE inv.libro_id = $1 AND b.activo = true AND s.activo = true
        ORDER BY s.nombre ASC, b.nombre ASC;`, [libro.id]);
      const disponibilidad = dispRes.rows.map((row) => ({
        ...row,
        stock_actual: Number(row.stock_actual) || 0,
      }));
      return {
        ...libro,
        disponibilidad,
        stock_total: disponibilidad.reduce((sum, row) => sum + row.stock_actual, 0),
      };
    }

    const libros = await Libro.findAll({
      where: { ...where, activo: true },
      attributes: ['id', 'titulo', 'isbn', 'resena', 'imagen_url', 'precio', 'creado_en', 'categoria_id'],
      include: [
        { model: Autor, as: 'autor', attributes: ['nombre'], required: false },
        { model: Editorial, as: 'editorial', attributes: ['nombre'], required: false },
        { model: Categoria, as: 'categoria', attributes: ['nombre'], required: false },
        {
          model: Inventario,
          as: 'inventarios',
          attributes: ['stock_actual'],
          required: false,
          include: [{
            model: Bodega,
            as: 'bodega',
            attributes: ['nombre'],
            where: { activo: true },
            required: true,
            include: [{
              model: Sucursal,
              as: 'sucursal',
              attributes: ['nombre', 'direccion', 'telefono'],
              where: { activo: true },
              required: true,
            }],
          }],
        },
      ],
      order: [
        ['creado_en', 'ASC'],
        [
          { model: Inventario, as: 'inventarios' },
          { model: Bodega, as: 'bodega' },
          { model: Sucursal, as: 'sucursal' },
          'nombre', 'ASC',
        ],
        [
          { model: Inventario, as: 'inventarios' },
          { model: Bodega, as: 'bodega' },
          'nombre', 'ASC',
        ],
      ],
      subQuery: false,
      ...transactionOption(executorOrOptions),
    });
    const libro = libros[0] || null;
    if (!libro) return null;

    const plain = libro.get({ plain: true });
    const disponibilidad = (plain.inventarios || []).map((inv) => ({
      sucursal_nombre: inv.bodega?.sucursal?.nombre,
      sucursal_direccion: inv.bodega?.sucursal?.direccion,
      sucursal_telefono: inv.bodega?.sucursal?.telefono,
      bodega_nombre: inv.bodega?.nombre,
      stock_actual: Number(inv.stock_actual) || 0,
    }));
    return {
      id: plain.id,
      titulo: plain.titulo,
      isbn: plain.isbn,
      resena: plain.resena,
      imagen_url: plain.imagen_url,
      precio: plain.precio,
      creado_en: plain.creado_en,
      categoria_id: plain.categoria_id,
      autor_nombre: plain.autor?.nombre ?? null,
      editorial_nombre: plain.editorial?.nombre ?? null,
      categoria_nombre: plain.categoria?.nombre ?? null,
      disponibilidad,
      stock_total: disponibilidad.reduce((sum, row) => sum + row.stock_actual, 0),
    };
  }
}

module.exports = new LibroRepository();

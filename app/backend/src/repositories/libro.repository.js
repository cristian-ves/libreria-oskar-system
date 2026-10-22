const { Libro, Autor, Editorial, Categoria, Inventario, Bodega, Sucursal, Sequelize } = require('../models');

const { Op } = Sequelize;

const LIBRO_ATTRIBUTES = [
  'id', 'titulo', 'isbn', 'resena', 'imagen_url', 'precio', 'activo', 'creado_en',
  'actualizado_en', 'autor_id', 'editorial_id', 'categoria_id',
];

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
  async findByIsbn(isbn, options = {}) {
    const cleanIsbn = typeof isbn === 'string' ? isbn.trim() : isbn;
    const libro = await Libro.findOne({
      where: { isbn: cleanIsbn },
      attributes: LIBRO_ATTRIBUTES,
      include: [
        { model: Autor, as: 'autor', attributes: ['nombre'], required: false },
        { model: Editorial, as: 'editorial', attributes: ['nombre'], required: false },
        { model: Categoria, as: 'categoria', attributes: ['nombre'], required: false },
      ],
      ...transactionOption(options),
    });
    return libroPlano(libro);
  }

  async findById(id, options = {}) {
    const libro = await Libro.findByPk(id, {
      attributes: LIBRO_ATTRIBUTES,
      include: [
        { model: Autor, as: 'autor', attributes: ['nombre'], required: false },
        { model: Editorial, as: 'editorial', attributes: ['nombre'], required: false },
        { model: Categoria, as: 'categoria', attributes: ['nombre'], required: false },
      ],
      ...transactionOption(options),
    });
    return libroPlano(libro);
  }

  /**
   * Libros por lista de ids, en formato plano (sin relaciones). Los ids inexistentes no aparecen.
   * @param {string[]} ids
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   * @returns {Promise<Array<{ id: string, titulo: string, isbn: string, precio: string, activo: boolean }>>}
   */
  async findByIds(ids, options = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return Libro.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'titulo', 'isbn', 'precio', 'activo'],
      raw: true,
      ...transactionOption(options),
    });
  }

  async updatePrecio(id, precio, options = {}) {
    const [filas] = await Libro.update({ precio }, { where: { id }, ...transactionOption(options) });
    if (!filas) return null;
    return this.findById(id, options);
  }

  async upsert(options, data) {
    const {
      autor_id = null, editorial_id = null, categoria_id = null,
      titulo, isbn, resena, imagen_url = null, precio = 0.00, activo = true,
    } = data;
    const values = [
      autor_id, editorial_id, categoria_id, titulo.trim(), isbn.trim(), resena.trim(),
      imagen_url, parseFloat(precio) || 0.00, activo,
    ];

    const ormOptions = transactionOption(options);
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
      ...ormOptions,
    });
    if (!created) {
      const updates = { titulo: values[3] };
      if (autor_id !== null && autor_id !== undefined) updates.autor_id = autor_id;
      if (editorial_id !== null && editorial_id !== undefined) updates.editorial_id = editorial_id;
      if (categoria_id !== null && categoria_id !== undefined) updates.categoria_id = categoria_id;
      if (resena !== null && resena !== undefined) updates.resena = resena.trim();
      if (imagen_url !== null && imagen_url !== undefined) updates.imagen_url = imagen_url;
      await libro.update(updates, ormOptions);
    }
    return libro.get({ plain: true });
  }

  async create(options, data) {
    const {
      autor_id = null, editorial_id = null, categoria_id = null,
      titulo, isbn = null, resena, imagen_url = null, precio = 0.00, activo = true,
    } = data;
    const values = [
      autor_id, editorial_id, categoria_id, titulo.trim(), isbn ? isbn.trim() : null,
      resena.trim(), imagen_url || null, parseFloat(precio) || 0.00, activo,
    ];
    try {
      const libro = await Libro.create({
        autor_id, editorial_id, categoria_id, titulo: values[3], isbn: values[4],
        resena: values[5], imagen_url: values[6], precio: values[7], activo,
      }, transactionOption(options));
      return libro.get({ plain: true });
    } catch (error) {
      // Conservar el código PostgreSQL que el servicio actual traduce a HTTP 409.
      if (error.name === 'SequelizeUniqueConstraintError' && !error.code) {
        error.code = error.original?.code || '23505';
      }
      throw error;
    }
  }

  async searchAndList(queryStr = '', categoriaId = null, options = {}) {
    const catId = categoriaId;
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
      ...transactionOption(options),
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

  async findDetalleByRef(parsed, options = {}) {
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
      ...transactionOption(options),
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

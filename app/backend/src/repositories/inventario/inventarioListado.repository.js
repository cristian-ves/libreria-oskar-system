const {
  Inventario,
  Libro,
  Bodega,
  Sucursal,
  Autor,
  Categoria,
  sequelize,
  Sequelize,
} = require('../../models');
const { ULTIMA_SALIDA_SQL } = require('./inventarioSubconsultas.helper');

const { Op } = Sequelize;

module.exports = {
  /**
   * Lista el inventario detallado por libro y bodega con métricas calculadas y filtros.
   * @param {{ estado?: string, q?: string, bodegaId?: string, diasStockObsoleto?: number }} params
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
  */
  async findAllWithDetails({ estado = 'todos', q = '', bodegaId = null, diasStockObsoleto = 90, limit = 200, offset = 0 }, options = {}) {
    const txOption = options.transaction ? { transaction: options.transaction } : {};

    const ultSal = ULTIMA_SALIDA_SQL;

    const whereConditions = [];

    if (bodegaId && typeof bodegaId === 'string' && bodegaId.trim()) {
      whereConditions.push({ bodega_id: bodegaId.trim() });
    }

    if (q && typeof q === 'string' && q.trim()) {
      const escaped = sequelize.escape(`%${q.trim().toLowerCase()}%`);
      whereConditions.push(
        sequelize.literal(`(
          LOWER("libro"."titulo") LIKE ${escaped}
          OR LOWER(COALESCE("libro->autor"."nombre", '')) LIKE ${escaped}
          OR LOWER("libro"."isbn") LIKE ${escaped}
        )`)
      );
    }

    const diasNum = Number(diasStockObsoleto) || 90;

    if (estado === 'en_stock') {
      whereConditions.push(sequelize.literal('"Inventario"."stock_actual" > "Inventario"."stock_minimo"'));
    } else if (estado === 'bajo_stock') {
      whereConditions.push(sequelize.literal('"Inventario"."stock_actual" <= "Inventario"."stock_minimo"'));
    } else if (estado === 'obsoleto') {
      whereConditions.push(
        sequelize.literal(`(
          "Inventario"."stock_actual" > 0 AND
          COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL)
        )`)
      );
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : undefined;
    const include = [
      {
        model: Libro,
        as: 'libro',
        attributes: ['id', 'titulo', 'isbn', 'imagen_url', 'activo'],
        include: [
          { model: Autor, as: 'autor', attributes: ['id', 'nombre'], required: false },
          { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], required: false },
        ],
        required: true,
      },
      {
        model: Bodega,
        as: 'bodega',
        attributes: ['id', 'nombre'],
        include: [{ model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre'], required: false }],
        required: true,
      },
    ];
    const [results, total] = await Promise.all([
      Inventario.findAll({
      where,
      attributes: [
        'id',
        'libro_id',
        'bodega_id',
        'stock_actual',
        'stock_minimo',
        [sequelize.literal(ultSal), 'ultima_salida'],
        [sequelize.literal('("Inventario"."stock_actual" <= "Inventario"."stock_minimo")'), 'bajo_stock'],
        [
          sequelize.literal(`(
            "Inventario"."stock_actual" > 0 AND
            COALESCE(${ultSal}, "Inventario"."creado_en") < (NOW() - (${diasNum} || ' days')::INTERVAL)
          )`),
          'obsoleto',
        ],
      ],
      include,
      order: [[{ model: Libro, as: 'libro' }, 'titulo', 'ASC'], ['id', 'ASC']],
      limit,
      offset,
      ...txOption,
      }),
      Inventario.count({ where, include, distinct: true, col: 'id', ...txOption }),
    ]);

    const data = results.map((item) => {
      const r = item.get ? item.get({ plain: true }) : item;
      return {
        inventario_id: r.id,
        libro_id: r.libro_id,
        titulo: r.libro?.titulo || null,
        isbn: r.libro?.isbn || null,
        imagen_url: r.libro?.imagen_url || null,
        libro_activo: Boolean(r.libro?.activo),
        autor: r.libro?.autor?.nombre || null,
        categoria: r.libro?.categoria?.nombre || null,
        bodega_id: r.bodega_id,
        bodega_nombre: r.bodega?.nombre || null,
        sucursal_nombre: r.bodega?.sucursal?.nombre || null,
        stock_actual: r.stock_actual,
        stock_minimo: r.stock_minimo,
        ultima_salida: r.ultima_salida,
        bajo_stock: Boolean(r.bajo_stock),
        obsoleto: Boolean(r.obsoleto),
      };
    });
    if (options.includeTotal) return { data, total: Number(total), limit, offset };
    return data;
  },
};

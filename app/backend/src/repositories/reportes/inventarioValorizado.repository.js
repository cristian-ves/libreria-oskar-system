const { QueryTypes } = require('sequelize');
const { sequelize, Inventario, Libro, Categoria, Bodega, Sucursal } = require('../../models');

function construirIncludes({ libroId, categoriaId, bodegaId }) {
  return [
    {
      model: Libro,
      as: 'libro',
      attributes: ['id', 'titulo', 'isbn', 'categoria_id', 'activo'],
      where: libroId ? { id: libroId } : undefined,
      required: true,
      include: [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre'],
        where: categoriaId ? { id: categoriaId } : undefined,
        required: Boolean(categoriaId),
      }],
    },
    {
      model: Bodega,
      as: 'bodega',
      attributes: ['id', 'nombre'],
      where: bodegaId ? { id: bodegaId } : undefined,
      required: true,
      include: [{ model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre'], required: false }],
    },
  ];
}

function filtrosSql({ libroId, categoriaId, bodegaId }) {
  const conditions = [];
  const replacements = { libroId: libroId || null, categoriaId: categoriaId || null, bodegaId: bodegaId || null };
  if (libroId) conditions.push('i.libro_id = :libroId');
  if (categoriaId) conditions.push('l.categoria_id = :categoriaId');
  if (bodegaId) conditions.push('i.bodega_id = :bodegaId');
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', replacements };
}

module.exports = {
  async findPage({ libroId = null, categoriaId = null, bodegaId = null, limit = 50, offset = 0 }) {
    const include = construirIncludes({ libroId, categoriaId, bodegaId });
    const [rows, total] = await Promise.all([
      Inventario.findAll({
        attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual'],
        include,
        order: [[{ model: Libro, as: 'libro' }, 'titulo', 'ASC'], ['bodega_id', 'ASC'], ['id', 'ASC']],
        limit,
        offset,
      }),
      Inventario.count({ include, distinct: true, col: 'id' }),
    ]);

    const registros = rows.map((instance) => {
      const row = instance.get({ plain: true });
      return {
        inventario_id: row.id,
        libro_id: row.libro_id,
        titulo: row.libro?.titulo || null,
        isbn: row.libro?.isbn || null,
        libro_activo: Boolean(row.libro?.activo),
        categoria_id: row.libro?.categoria?.id || null,
        categoria: row.libro?.categoria?.nombre || null,
        bodega_id: row.bodega_id,
        bodega: row.bodega?.nombre || null,
        sucursal: row.bodega?.sucursal?.nombre || null,
        existencias: Number(row.stock_actual),
        costo_unitario: null,
        valor_total: null,
      };
    });

    // Agregación analítica con agrupaciones por categoría, bodega y total. Los JOIN son a relaciones
    // belongsTo (uno a uno desde inventario), por lo que no multiplican las existencias.
    const { where, replacements } = filtrosSql({ libroId, categoriaId, bodegaId });
    const grupos = await sequelize.query(`
      SELECT c.id AS categoria_id, c.nombre AS categoria,
             b.id AS bodega_id, b.nombre AS bodega,
             COALESCE(SUM(i.stock_actual), 0)::bigint AS existencias,
             COUNT(i.id)::bigint AS registros,
             GROUPING(c.id) AS categoria_agrupada,
             GROUPING(b.id) AS bodega_agrupada
        FROM inventarios i
        JOIN libros l ON l.id = i.libro_id
        LEFT JOIN categorias c ON c.id = l.categoria_id
        JOIN bodegas b ON b.id = i.bodega_id
        ${where}
       GROUP BY GROUPING SETS ((c.id, c.nombre), (b.id, b.nombre), ())
    `, { replacements, type: QueryTypes.SELECT });

    const totales_por_categoria = [];
    const totales_por_bodega = [];
    let general = { registros: 0, existencias: 0 };
    for (const group of grupos) {
      const valor = { registros: Number(group.registros), existencias: Number(group.existencias), valor_total: null };
      const categoriaAgrupada = Number(group.categoria_agrupada);
      const bodegaAgrupada = Number(group.bodega_agrupada);
      if (categoriaAgrupada === 1 && bodegaAgrupada === 1) general = valor;
      else if (categoriaAgrupada === 0 && bodegaAgrupada === 1) {
        totales_por_categoria.push({ categoria_id: group.categoria_id, categoria: group.categoria, ...valor });
      } else if (categoriaAgrupada === 1 && bodegaAgrupada === 0) {
        totales_por_bodega.push({ bodega_id: group.bodega_id, bodega: group.bodega, ...valor });
      }
    }

    return {
      total: Number(total), limit, offset, registros,
      resumen: { ...general, valoracion_disponible: false },
      totales_por_categoria,
      totales_por_bodega,
    };
  },
};

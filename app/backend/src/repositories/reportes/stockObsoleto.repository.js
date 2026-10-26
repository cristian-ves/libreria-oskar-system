const { QueryTypes } = require('sequelize');
const { sequelize, Sucursal, Bodega } = require('../../models');

// Consulta analítica: agrega ventas/movimientos por inventario sin N+1 y pagina en PostgreSQL.
const BASE = `
  WITH base AS (
    SELECT i.id AS inventario_id, i.libro_id, l.titulo, l.isbn,
           c.id AS categoria_id, c.nombre AS categoria,
           b.id AS bodega_id, b.nombre AS bodega, s.id AS sucursal_id, s.nombre AS sucursal,
           i.stock_actual AS existencias, i.stock_minimo, l.precio AS precio_vigente,
           l.activo AS libro_activo, ultima.fecha AS ultima_venta,
           COALESCE(primera.fecha, i.creado_en) AS fecha_referencia,
           COALESCE(ultima.fecha, primera.fecha, i.creado_en) AS fecha_rotacion
      FROM inventarios i
      JOIN libros l ON l.id = i.libro_id
      LEFT JOIN categorias c ON c.id = l.categoria_id
      JOIN bodegas b ON b.id = i.bodega_id AND b.activo = TRUE
      JOIN sucursales s ON s.id = b.sucursal_id AND s.activo = TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(v.creado_en) AS fecha
          FROM venta_detalles vd
          JOIN ventas v ON v.id = vd.venta_id
         WHERE vd.libro_id = i.libro_id
           AND v.bodega_id = i.bodega_id
           AND v.estado = 'Completada'
      ) ultima ON TRUE
      LEFT JOIN LATERAL (
        SELECT MIN(m.fecha_movimiento) AS fecha
          FROM movimientos_inventario m
          JOIN tipo_movimientos tm ON tm.id = m.tipo_movimiento_id
         WHERE m.inventario_id = i.id
           AND tm.nombre = 'Ingreso'
           AND m.venta_id IS NULL
      ) primera ON TRUE
     WHERE i.stock_actual > 0
       AND (:libroActivo IS NULL OR l.activo = :libroActivo)
       AND (:categoriaId IS NULL OR l.categoria_id = :categoriaId)
       AND (:bodegaId IS NULL OR b.id = :bodegaId)
       AND (:sucursalId IS NULL OR s.id = :sucursalId)
       AND (:q IS NULL OR l.titulo ILIKE :q OR COALESCE(l.isbn, '') ILIKE :q)
  ), elegibles AS (
    SELECT base.*,
           ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date
             - (fecha_rotacion AT TIME ZONE 'America/Guatemala')::date)::integer AS dias_sin_rotacion
      FROM base
     WHERE fecha_rotacion <= CURRENT_TIMESTAMP - (:diasSinVenta * INTERVAL '1 day')
  )`;

module.exports = {
  async findSucursalesActivas() {
    const rows = await Sucursal.findAll({
      attributes: ['id', 'nombre'],
      where: { activo: true },
      include: [{ model: Bodega, as: 'bodegas', attributes: ['id'], where: { activo: true }, required: true }],
      order: [['nombre', 'ASC'], ['id', 'ASC'], [{ model: Bodega, as: 'bodegas' }, 'id', 'ASC']],
      raw: true,
    });
    const ids = new Set();
    return rows.filter((sucursal) => {
      if (ids.has(sucursal.id)) return false;
      ids.add(sucursal.id);
      return true;
    }).map(({ id, nombre }) => ({ id, nombre }));
  },
  async findPage({ diasSinVenta, q = null, categoriaId = null, bodegaId = null, sucursalId = null, libroActivo = null, limit = 50, offset = 0 }) {
    const replacements = {
      diasSinVenta: Number(diasSinVenta),
      q: q ? `%${q}%` : null,
      categoriaId,
      bodegaId,
      sucursalId,
      libroActivo: libroActivo === 'activo' ? true : libroActivo === 'inactivo' ? false : null,
      limit: Number(limit),
      offset: Number(offset),
    };
    const [rows, aggregates] = await Promise.all([
      sequelize.query(`${BASE}
        SELECT * FROM elegibles
         ORDER BY dias_sin_rotacion DESC, titulo ASC, bodega_id ASC, inventario_id ASC
         LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(`${BASE}
        SELECT COUNT(*)::integer AS total, COALESCE(SUM(existencias), 0)::bigint AS existencias
          FROM elegibles`, { replacements, type: QueryTypes.SELECT }),
    ]);
    return { rows, total: Number(aggregates[0]?.total || 0), existencias: Number(aggregates[0]?.existencias || 0) };
  },
};

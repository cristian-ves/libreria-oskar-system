const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../models');

// Consultas de agregación analítica: mantienen los totales en NUMERIC en PostgreSQL y evitan
// multiplicar importes de cabecera al unirlos con las líneas de venta.
async function select(sql, replacements = {}) {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
}

function whereFechas(inicio, finExclusivo, alias = 'v') {
  const clauses = [];
  if (inicio) clauses.push(`${alias}.creado_en >= :inicio`);
  if (finExclusivo) clauses.push(`${alias}.creado_en < :finExclusivo`);
  return clauses.length ? `AND ${clauses.join(' AND ')}` : '';
}

module.exports = {
  async resumenEstado({ inicio = null, finExclusivo = null }) {
    return select(`
      SELECT estado, COUNT(*)::bigint AS cantidad,
             COALESCE(SUM(subtotal), 0)::text AS bruto,
             COALESCE(SUM(descuento), 0)::text AS descuentos,
             COALESCE(SUM(total), 0)::text AS neto
        FROM ventas v
       WHERE 1=1 ${whereFechas(inicio, finExclusivo)}
       GROUP BY estado
    `, { inicio, finExclusivo });
  },

  async cortePorMetodo({ inicio, finExclusivo }) {
    return select(`
      SELECT metodo_pago, COUNT(*)::bigint AS cantidad,
             COALESCE(SUM(total), 0)::text AS total
        FROM ventas v
       WHERE estado = 'Completada' ${whereFechas(inicio, finExclusivo)}
       GROUP BY metodo_pago ORDER BY metodo_pago ASC
    `, { inicio, finExclusivo });
  },

  async cortePorVendedor({ inicio, finExclusivo }) {
    return select(`
      SELECT v.usuario_id AS vendedor_id, u.nombre_completo AS vendedor,
             COUNT(*)::bigint AS cantidad,
             COALESCE(SUM(v.total), 0)::text AS total
        FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.estado = 'Completada' ${whereFechas(inicio, finExclusivo)}
       GROUP BY v.usuario_id, u.nombre_completo
       ORDER BY u.nombre_completo ASC, v.usuario_id ASC
    `, { inicio, finExclusivo });
  },

  async librosMasVendidos({ inicio = null, finExclusivo = null, limit = 10, offset = 0 }) {
    const conditions = ["v.estado = 'Completada'"];
    if (inicio) conditions.push('v.creado_en >= :inicio');
    if (finExclusivo) conditions.push('v.creado_en < :finExclusivo');
    const replacements = { inicio, finExclusivo, limit, offset };
    const where = conditions.join(' AND ');
    const [rows, countRows] = await Promise.all([
      select(`
        SELECT l.id AS libro_id, l.titulo, l.isbn,
               SUM(d.cantidad)::bigint AS unidades_vendidas,
               COALESCE(SUM(d.subtotal), 0)::text AS ingresos_brutos
          FROM venta_detalles d
          JOIN ventas v ON v.id = d.venta_id
          JOIN libros l ON l.id = d.libro_id
         WHERE ${where}
         GROUP BY l.id, l.titulo, l.isbn
         ORDER BY SUM(d.cantidad) DESC, SUM(d.subtotal) DESC, l.titulo ASC, l.id ASC
         LIMIT :limit OFFSET :offset
      `, replacements),
      select(`
        SELECT COUNT(*)::bigint AS total FROM (
          SELECT d.libro_id FROM venta_detalles d JOIN ventas v ON v.id = d.venta_id
           WHERE ${where} GROUP BY d.libro_id
        ) ranking
      `, { inicio, finExclusivo }),
    ]);
    return { rows, total: Number(countRows[0]?.total || 0) };
  },

  async reposicion({ inicio = null, finExclusivo = null, bodegaId = null, categoriaId = null, libroId = null, limit = 50, offset = 0 }) {
    const conditions = [];
    const replacements = { inicio, finExclusivo, bodegaId, categoriaId, libroId, limit, offset };
    if (bodegaId) conditions.push('i.bodega_id = :bodegaId');
    if (categoriaId) conditions.push('l.categoria_id = :categoriaId');
    if (libroId) conditions.push('l.id = :libroId');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rangoVentas = [
      inicio ? 'AND v.creado_en >= :inicio' : '',
      finExclusivo ? 'AND v.creado_en < :finExclusivo' : '',
    ].filter(Boolean).join(' ');
    const [rows, countRows] = await Promise.all([
      select(`
        SELECT i.id AS inventario_id, l.id AS libro_id, l.titulo, l.isbn,
               l.activo AS libro_activo, c.id AS categoria_id, c.nombre AS categoria,
               b.id AS bodega_id, b.nombre AS bodega,
               i.stock_actual AS existencias, i.stock_minimo,
               COALESCE(vendido.unidades_vendidas, 0)::bigint AS unidades_vendidas
          FROM inventarios i JOIN libros l ON l.id = i.libro_id
          JOIN bodegas b ON b.id = i.bodega_id
          LEFT JOIN categorias c ON c.id = l.categoria_id
          LEFT JOIN LATERAL (
            SELECT SUM(d.cantidad)::bigint AS unidades_vendidas
              FROM venta_detalles d JOIN ventas v ON v.id = d.venta_id
             WHERE d.libro_id = l.id AND v.bodega_id = i.bodega_id
               AND v.estado = 'Completada' ${rangoVentas}
          ) vendido ON TRUE
          ${where}
         ORDER BY l.titulo ASC, b.nombre ASC, i.id ASC
         LIMIT :limit OFFSET :offset
      `, replacements),
      select(`SELECT COUNT(*)::bigint AS total FROM inventarios i JOIN libros l ON l.id = i.libro_id ${where}`, replacements),
    ]);
    return { rows, total: Number(countRows[0]?.total || 0) };
  },

  async ventas({ inicio = null, finExclusivo = null, estado = null, vendedorId = null, metodoPago = null, limit = 50, offset = 0 }) {
    const conditions = [];
    const replacements = { inicio, finExclusivo, estado, vendedorId, metodoPago, limit, offset };
    if (inicio) conditions.push('v.creado_en >= :inicio');
    if (finExclusivo) conditions.push('v.creado_en < :finExclusivo');
    if (estado) conditions.push('v.estado = :estado');
    if (vendedorId) conditions.push('v.usuario_id = :vendedorId');
    if (metodoPago) conditions.push('v.metodo_pago = :metodoPago');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, countRows] = await Promise.all([
      select(`
        SELECT v.id, v.numero, v.creado_en AS fecha, v.usuario_id AS vendedor_id,
               u.nombre_completo AS vendedor, v.estado, v.metodo_pago,
               v.subtotal::text, v.descuento::text, v.total::text,
               v.anulada_en, v.anulada_por, v.motivo_anulacion
          FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
          ${where}
         ORDER BY v.creado_en DESC, v.numero DESC, v.id ASC
         LIMIT :limit OFFSET :offset
      `, replacements),
      select(`SELECT COUNT(*)::bigint AS total FROM ventas v ${where}`, { inicio, finExclusivo, estado, vendedorId, metodoPago }),
    ]);
    return { rows, total: Number(countRows[0]?.total || 0) };
  },
};

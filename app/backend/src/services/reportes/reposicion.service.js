const repository = require('../../repositories/reportes/ventas.repository');
const { respuestaPaginada } = require('./contrato.service');
const { rangoFechasNegocio } = require('../../utils/ventas');

module.exports = {
  async generar({ desde = null, hasta = null, bodegaId = null, categoriaId = null, libroId = null, limit = 50, offset = 0 }) {
    const { inicio, finExclusivo } = rangoFechasNegocio(desde, hasta);
    const pagina = await repository.reposicion({ inicio, finExclusivo, bodegaId, categoriaId, libroId, limit: Number(limit), offset: Number(offset) });
    const registros = pagina.rows.map((row) => {
      const activo = Boolean(row.libro_activo);
      const existencias = Number(row.existencias);
      const minimo = Number(row.stock_minimo);
      return {
        inventario_id: row.inventario_id, libro_id: row.libro_id, titulo: row.titulo, isbn: row.isbn,
        libro_activo: activo, categoria_id: row.categoria_id, categoria: row.categoria,
        bodega_id: row.bodega_id, bodega: row.bodega, existencias, stock_minimo: minimo,
        unidades_vendidas_periodo: Number(row.unidades_vendidas),
        necesita_reposicion: activo && existencias <= minimo,
        cantidad_sugerida: null,
      };
    });
    return respuestaPaginada({
      filtros: { desde, hasta, bodegaId, categoriaId, libroId, ventas: 'solo Completada por libro y bodega' },
      total: pagina.total, limit: Number(limit), offset: Number(offset), propiedadDatos: 'registros', datos: registros,
      extra: { criterio: 'Indicador verificable: libro activo y existencias <= stock mínimo. cantidad_sugerida=null porque no hay plazo de entrega ni nivel objetivo persistidos.' },
    });
  },
};

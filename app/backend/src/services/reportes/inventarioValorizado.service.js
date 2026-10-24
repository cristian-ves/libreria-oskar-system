const reporteRepository = require('../../repositories/reportes/inventarioValorizado.repository');
const { respuestaPaginada } = require('./contrato.service');

module.exports = {
  async generar({ libroId = null, categoriaId = null, bodegaId = null, limit = 50, offset = 0 } = {}) {
    const pagina = await reporteRepository.findPage({ libroId, categoriaId, bodegaId, limit, offset });
    return respuestaPaginada({
      filtros: { libroId, categoriaId, bodegaId },
      total: pagina.total,
      limit: pagina.limit,
      offset: pagina.offset,
      propiedadDatos: 'registros',
      datos: pagina.registros,
      extra: {
        resumen: pagina.resumen,
        totales_por_categoria: pagina.totales_por_categoria,
        totales_por_bodega: pagina.totales_por_bodega,
      },
    });
  },
};

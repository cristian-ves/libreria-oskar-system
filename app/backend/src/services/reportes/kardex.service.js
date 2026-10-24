const kardexRepository = require('../../repositories/reportes/kardex.repository');
const { rangoFechasNegocio } = require('../../utils/ventas');
const { respuestaPaginada } = require('./contrato.service');

module.exports = {
  async generar({ libroId = null, categoriaId = null, bodegaId = null, tipo = null, desde = null, hasta = null, limit = 50, offset = 0 } = {}) {
    const { inicio, finExclusivo } = rangoFechasNegocio(desde, hasta);
    const pagina = await kardexRepository.findPage({
      libroId, categoriaId, bodegaId, tipo, inicio, finExclusivo, limit, offset,
    });
    return respuestaPaginada({
      filtros: { libroId, categoriaId, bodegaId, tipo, desde, hasta },
      total: pagina.total,
      limit: pagina.limit,
      offset: pagina.offset,
      propiedadDatos: 'movimientos',
      datos: pagina.movimientos.map((movimiento) => ({
        ...movimiento,
        existencias_resultantes: null,
      })),
    });
  },
};

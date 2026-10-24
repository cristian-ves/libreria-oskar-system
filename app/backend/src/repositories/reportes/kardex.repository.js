const movimientoRepository = require('../movimiento.repository');

module.exports = {
  findPage({ libroId = null, bodegaId = null, categoriaId = null, tipo = null, inicio = null, finExclusivo = null, limit = 50, offset = 0 }) {
    return movimientoRepository.findAllWithFilters({
      libroId, bodegaId, categoriaId, tipo, inicio, finExclusivo, limit, offset, incluirVentaId: true,
    });
  },
};

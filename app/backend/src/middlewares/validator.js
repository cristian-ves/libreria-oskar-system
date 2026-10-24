const {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
  validateActualizarPrecioLibro,
  validateEditarLibro,
  validateCambiarActivoLibro,
  validateAdminListarLibros,
} = require('./validators/libro.validators');
const {
  validateListarInventario,
  validateSalidaInventario,
  validateAjusteInventario,
} = require('./validators/inventario.validators');
const {
  validateCrearVenta,
  validateListarVentas,
  validateVentaId,
  validateAnularVenta,
} = require('./validators/venta.validators');
const { validateListarMovimientos } = require('./validators/movimiento.validators');
const { validatePaginacion } = require('./validators/pagination.validators');

module.exports = {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
  validateActualizarPrecioLibro,
  validateEditarLibro,
  validateCambiarActivoLibro,
  validateAdminListarLibros,
  validateListarInventario,
  validateListarMovimientos,
  validateSalidaInventario,
  validateAjusteInventario,
  validateCrearVenta,
  validateListarVentas,
  validatePaginacion,
  validateVentaId,
  validateAnularVenta,
};

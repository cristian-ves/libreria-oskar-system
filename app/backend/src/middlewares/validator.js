const {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
} = require('./validators/libro.validators');
const {
  validateListarInventario,
  validateSalidaInventario,
  validateAjusteInventario,
} = require('./validators/inventario.validators');
const { validateListarMovimientos } = require('./validators/movimiento.validators');

module.exports = {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
  validateListarInventario,
  validateListarMovimientos,
  validateSalidaInventario,
  validateAjusteInventario,
};

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
const { validateReporteInventario, validateReporteKardex, validateStockObsoleto } = require('./validators/reportes.validators');
const {
  validateCorteCaja, validateResumenPeriodo, validateLibrosMasVendidos,
  validateReposicion, validateVentasReporte,
} = require('./validators/reportesVentas.validators');
const { validateReporteExportacion } = require('./validators/exportacionReportes.validators');

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
  validateReporteInventario,
  validateReporteKardex,
  validateStockObsoleto,
  validateCorteCaja,
  validateResumenPeriodo,
  validateLibrosMasVendidos,
  validateReposicion,
  validateVentasReporte,
  validateReporteExportacion,
};

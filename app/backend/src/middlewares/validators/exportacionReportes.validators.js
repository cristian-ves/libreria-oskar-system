const { ValidationError, NotFoundError } = require('../../utils/errors');
const { validateReporteInventario, validateReporteKardex } = require('./reportes.validators');
const { MAX_EXPORT_ROWS } = require('../../services/reportes/exportadores/exportacion.config');
const {
  validateCorteCaja,
  validateResumenPeriodo,
  validateLibrosMasVendidos,
  validateReposicion,
  validateVentasReporte,
} = require('./reportesVentas.validators');
const { validateStockObsoleto } = require('./reportes.validators');

const VALIDADORES = {
  'corte-caja': validateCorteCaja,
  'resumen-periodo': validateResumenPeriodo,
  'libros-mas-vendidos': validateLibrosMasVendidos,
  reposicion: validateReposicion,
  'inventario-valorizado': validateReporteInventario,
  kardex: validateReporteKardex,
  ventas: validateVentasReporte,
  'stock-obsoleto': validateStockObsoleto,
};
function validateReporteExportacion(req, res, next) {
  const tipo = req.params && req.params.tipo;
  if (typeof tipo !== 'string' || !Object.hasOwn(VALIDADORES, tipo)) {
    return next(new NotFoundError('El tipo de reporte indicado no existe.'));
  }
  const formato = req.query && req.query.formato;
  if (typeof formato !== 'string' || !['xlsx', 'pdf'].includes(formato)) {
    return next(new ValidationError('El formato de exportación debe ser "xlsx" o "pdf".'));
  }
  const maxRegistros = req.query && req.query.maxRegistros;
  if (maxRegistros !== undefined && (typeof maxRegistros !== 'string' || !/^\d+$/.test(maxRegistros)
    || !Number.isSafeInteger(Number(maxRegistros)) || Number(maxRegistros) < 1 || Number(maxRegistros) > MAX_EXPORT_ROWS)) {
    return next(new ValidationError(`El parámetro "maxRegistros" debe ser un entero entre 1 y ${MAX_EXPORT_ROWS}.`));
  }
  return VALIDADORES[tipo](req, res, next);
}

module.exports = { validateReporteExportacion };

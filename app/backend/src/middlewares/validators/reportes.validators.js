const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');
const { rangoFechasNegocio } = require('../../utils/ventas');

const TIPOS_MOVIMIENTO = ['Ingreso', 'Salida', 'Ajuste', 'Ajuste Auditoria'];
const UUID_PARAMS = ['libroId', 'bodegaId', 'categoriaId'];

function validateReporteInventario(req, res, next) {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const errors = [];
  for (const key of UUID_PARAMS) {
    const value = query[key];
    if (value !== undefined && (typeof value !== 'string' || !UUID_REGEX.test(value))) {
      errors.push(`El parámetro "${key}" debe ser un UUID válido.`);
    }
  }
  validarPaginacion(query, errors);
  if (errors.length) return next(new ValidationError('Parámetros inválidos para el reporte de inventario valorizado.', errors));
  return next();
}

function validateReporteKardex(req, res, next) {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const errors = [];
  for (const key of UUID_PARAMS) {
    const value = query[key];
    if (value !== undefined && (typeof value !== 'string' || !UUID_REGEX.test(value))) {
      errors.push(`El parámetro "${key}" debe ser un UUID válido.`);
    }
  }
  if (query.tipo !== undefined && (typeof query.tipo !== 'string' || !TIPOS_MOVIMIENTO.some((tipo) => tipo.toLowerCase() === query.tipo.toLowerCase()))) {
    errors.push(`El parámetro "tipo" debe ser uno de: ${TIPOS_MOVIMIENTO.join(', ')}.`);
  }
  try {
    rangoFechasNegocio(query.desde, query.hasta);
  } catch (error) {
    errors.push(error.message);
  }
  validarPaginacion(query, errors);
  if (errors.length) return next(new ValidationError('Parámetros inválidos para el reporte Kardex.', errors));
  return next();
}

function validarPaginacion(query, errors) {
  for (const [key, min, max] of [['limit', 1, 200], ['offset', 0, Number.MAX_SAFE_INTEGER]]) {
    const value = query[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      errors.push(`El parámetro "${key}" debe ser un entero ${key === 'limit' ? 'entre 1 y 200' : 'mayor o igual a 0'}.`);
    }
  }
}

function validateStockObsoleto(req, res, next) {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const errors = [];
  for (const key of ['categoriaId', 'bodegaId', 'sucursalId']) {
    if (query[key] !== undefined && (typeof query[key] !== 'string' || !UUID_REGEX.test(query[key]))) errors.push(`El parámetro "${key}" debe ser un UUID válido.`);
  }
  if (query.diasSinVenta !== undefined && (typeof query.diasSinVenta !== 'string' || !/^\d+$/.test(query.diasSinVenta)
    || !Number.isSafeInteger(Number(query.diasSinVenta)) || Number(query.diasSinVenta) < 1 || Number(query.diasSinVenta) > 3650)) {
    errors.push('El parámetro "diasSinVenta" debe ser un entero entre 1 y 3650.');
  }
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.trim().length > 120)) errors.push('El parámetro "q" debe ser texto de hasta 120 caracteres.');
  if (query.libroActivo !== undefined && !['activo', 'inactivo', 'todos'].includes(query.libroActivo)) errors.push('El parámetro "libroActivo" debe ser activo, inactivo o todos.');
  validarPaginacion(query, errors);
  if (errors.length) return next(new ValidationError('Parámetros inválidos para el reporte de stock obsoleto.', errors));
  return next();
}

module.exports = { validateReporteInventario, validateReporteKardex, validateStockObsoleto };

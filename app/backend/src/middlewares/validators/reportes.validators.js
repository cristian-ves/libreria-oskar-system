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

module.exports = { validateReporteInventario, validateReporteKardex };

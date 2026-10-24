const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');
const { rangoFechasNegocio } = require('../../utils/ventas');

const ESTADOS = ['Completada', 'Anulada'];
const METODOS_PAGO = ['Efectivo', 'Transferencia'];
const escalar = (value) => typeof value === 'string';

function validarPaginacion(query, errors, defaultLimit = 50) {
  for (const [key, min, max] of [['limit', 1, 200], ['offset', 0, Number.MAX_SAFE_INTEGER]]) {
    const value = query[key];
    if (value === undefined) continue;
    if (!escalar(value) || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      errors.push(`El parámetro "${key}" debe ser un entero ${key === 'limit' ? 'entre 1 y 200' : 'mayor o igual a 0'}.`);
    }
  }
  return { limit: query.limit === undefined ? defaultLimit : Number(query.limit), offset: query.offset === undefined ? 0 : Number(query.offset) };
}

function validarRango(query, errors, { required = false } = {}) {
  if (required && (!query.desde || !query.hasta)) {
    errors.push('Los parámetros "desde" y "hasta" son obligatorios.');
    return;
  }
  try { rangoFechasNegocio(query.desde, query.hasta); }
  catch (error) { errors.push(error.message); }
}

function validar(query, titulo, revisar) {
  const errors = [];
  revisar(query, errors);
  if (errors.length) return new ValidationError(`Parámetros inválidos para el reporte ${titulo}.`, errors);
  return null;
}

function validateCorteCaja(req, res, next) {
  const query = req.query || {};
  const error = validar(query, 'corte de caja', (q, errors) => {
    if (!escalar(q.fecha)) errors.push('El parámetro "fecha" es obligatorio y debe usar YYYY-MM-DD.');
    else { try { rangoFechasNegocio(q.fecha, q.fecha); } catch (e) { errors.push(e.message.replaceAll('desde', 'fecha').replaceAll('hasta', 'fecha')); } }
  });
  return error ? next(error) : next();
}

function validateResumenPeriodo(req, res, next) {
  const query = req.query || {};
  const error = validar(query, 'resumen del período', (q, errors) => validarRango({ desde: q.desde, hasta: q.hasta }, errors, { required: true }));
  return error ? next(error) : next();
}

function validateLibrosMasVendidos(req, res, next) {
  const query = req.query || {};
  const error = validar(query, 'libros más vendidos', (q, errors) => {
    validarRango(q, errors);
    validarPaginacion(q, errors, 10);
  });
  return error ? next(error) : next();
}

function validateReposicion(req, res, next) {
  const query = req.query || {};
  const error = validar(query, 'reposición', (q, errors) => {
    validarRango(q, errors);
    for (const key of ['bodegaId', 'categoriaId', 'libroId']) {
      if (q[key] !== undefined && (!escalar(q[key]) || !UUID_REGEX.test(q[key]))) errors.push(`El parámetro "${key}" debe ser un UUID válido.`);
    }
    validarPaginacion(q, errors);
  });
  return error ? next(error) : next();
}

function validateVentasReporte(req, res, next) {
  const query = req.query || {};
  const error = validar(query, 'ventas', (q, errors) => {
    validarRango(q, errors);
    if (q.estado !== undefined && (!escalar(q.estado) || !ESTADOS.includes(q.estado))) errors.push(`El parámetro "estado" debe ser uno de: ${ESTADOS.join(', ')}.`);
    if (q.metodoPago !== undefined && (!escalar(q.metodoPago) || !METODOS_PAGO.includes(q.metodoPago))) errors.push(`El parámetro "metodoPago" debe ser uno de: ${METODOS_PAGO.join(', ')}.`);
    if (q.vendedorId !== undefined && (!escalar(q.vendedorId) || !UUID_REGEX.test(q.vendedorId))) errors.push('El parámetro "vendedorId" debe ser un UUID válido.');
    validarPaginacion(q, errors);
  });
  return error ? next(error) : next();
}

module.exports = { validateCorteCaja, validateResumenPeriodo, validateLibrosMasVendidos, validateReposicion, validateVentasReporte };

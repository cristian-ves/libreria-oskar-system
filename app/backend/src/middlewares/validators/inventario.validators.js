const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');

/**
 * Middleware para validar los query params de listar inventario.
 * GET /api/inventario?estado=todos|en_stock|bajo_stock|obsoleto&q=&bodegaId=
 */
const validateListarInventario = (req, res, next) => {
  const { estado, bodegaId } = req.query || {};
  const errors = [];

  const estadosValidos = ['todos', 'en_stock', 'bajo_stock', 'obsoleto'];
  if (estado && !estadosValidos.includes(estado)) {
    errors.push(`El parámetro "estado" no es válido. Opciones permitidas: ${estadosValidos.join(', ')}.`);
  }

  if (bodegaId && !UUID_REGEX.test(bodegaId)) {
    errors.push('El parámetro "bodegaId" debe ser un UUID válido.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Parámetros de consulta inválidos para inventario.', errors));
  }

  next();
};

/**
 * Middleware para validar la salida de mercancía.
 * POST /api/inventario/:id/salida — body: { cantidad, motivo? }
 */
const validateSalidaInventario = (req, res, next) => {
  const { id } = req.params || {};
  const { cantidad } = req.body || {};
  const errors = [];

  if (!id || !UUID_REGEX.test(id)) {
    errors.push('El parámetro "id" de inventario debe ser un UUID válido.');
  }

  const cantidadNum = Number(cantidad);
  if (cantidad === undefined || cantidad === null || cantidad === '') {
    errors.push('El campo "cantidad" es obligatorio.');
  } else if (!Number.isInteger(cantidadNum) || cantidadNum < 1) {
    errors.push('El campo "cantidad" debe ser un número entero mayor o igual a 1.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para la salida de inventario.', errors));
  }

  next();
};

/**
 * Middleware para validar el ajuste de stock.
 * POST /api/inventario/:id/ajuste — body: { stockNuevo, motivo }
 */
const validateAjusteInventario = (req, res, next) => {
  const { id } = req.params || {};
  const { stockNuevo, motivo } = req.body || {};
  const errors = [];

  if (!id || !UUID_REGEX.test(id)) {
    errors.push('El parámetro "id" de inventario debe ser un UUID válido.');
  }

  const stockNuevoNum = Number(stockNuevo);
  if (stockNuevo === undefined || stockNuevo === null || stockNuevo === '') {
    errors.push('El campo "stockNuevo" es obligatorio.');
  } else if (!Number.isInteger(stockNuevoNum) || stockNuevoNum < 0) {
    errors.push('El campo "stockNuevo" debe ser un número entero mayor o igual a 0.');
  }

  if (!motivo || typeof motivo !== 'string' || motivo.trim() === '') {
    errors.push('El campo "motivo" es obligatorio y debe ser una cadena no vacía.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para el ajuste de inventario.', errors));
  }

  next();
};

module.exports = {
  validateListarInventario,
  validateSalidaInventario,
  validateAjusteInventario,
};

const { ValidationError } = require('../utils/errors');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware para validar el payload de escaneo de libros.
 */
const validateEscanearLibro = (req, res, next) => {
  const { isbn, bodegaId, usuarioId } = req.body || {};

  const errors = [];

  if (!isbn || typeof isbn !== 'string' || isbn.trim() === '') {
    errors.push('El campo "isbn" es obligatorio y debe ser una cadena no vacía.');
  }

  if (!bodegaId) {
    errors.push('El campo "bodegaId" es obligatorio.');
  } else if (!UUID_REGEX.test(bodegaId)) {
    errors.push('El campo "bodegaId" debe ser un UUID válido.');
  }

  if (!usuarioId) {
    errors.push('El campo "usuarioId" es obligatorio.');
  } else if (!UUID_REGEX.test(usuarioId)) {
    errors.push('El campo "usuarioId" debe ser un UUID válido.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para el escaneo.', errors));
  }

  next();
};

module.exports = {
  validateEscanearLibro,
};

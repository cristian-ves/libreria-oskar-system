const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');

/**
 * Middleware para validar los query params de listar movimientos (kardex).
 * GET /api/movimientos?libroId=&bodegaId=&tipo=&limit=&offset=
 */
const validateListarMovimientos = (req, res, next) => {
  const { libroId, bodegaId, tipo, limit, offset } = req.query || {};
  const errors = [];

  if (libroId && !UUID_REGEX.test(libroId)) {
    errors.push('El parámetro "libroId" debe ser un UUID válido.');
  }

  if (bodegaId && !UUID_REGEX.test(bodegaId)) {
    errors.push('El parámetro "bodegaId" debe ser un UUID válido.');
  }

  const tiposValidos = ['ingreso', 'salida', 'ajuste'];
  if (tipo && !tiposValidos.includes(tipo.toLowerCase())) {
    errors.push('El parámetro "tipo" debe ser uno de: Ingreso, Salida, Ajuste.');
  }

  if (limit !== undefined && limit !== null && limit !== '') {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 200) {
      errors.push('El parámetro "limit" debe ser un número entero entre 1 y 200.');
    }
  }

  if (offset !== undefined && offset !== null && offset !== '') {
    const offsetNum = Number(offset);
    if (!Number.isInteger(offsetNum) || offsetNum < 0) {
      errors.push('El parámetro "offset" debe ser un número entero mayor o igual a 0.');
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Parámetros de consulta inválidos para movimientos.', errors));
  }

  next();
};

module.exports = {
  validateListarMovimientos,
};

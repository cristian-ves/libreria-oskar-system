const { ValidationError } = require('../../utils/errors');

const validatePaginacion = (req, res, next) => {
  const query = req.query || {};
  const errors = [];

  for (const [name, min, max] of [['limit', 1, 200], ['offset', 0, Number.MAX_SAFE_INTEGER]]) {
    const value = query[name];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      errors.push(`El parámetro "${name}" debe ser un entero ${name === 'limit' ? 'entre 1 y 200' : 'mayor o igual a 0'}.`);
      continue;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
      errors.push(`El parámetro "${name}" debe ser un entero ${name === 'limit' ? 'entre 1 y 200' : 'mayor o igual a 0'}.`);
    }
  }

  if (errors.length) return next(new ValidationError('Parámetros de paginación inválidos.', errors));
  return next();
};

module.exports = { validatePaginacion };

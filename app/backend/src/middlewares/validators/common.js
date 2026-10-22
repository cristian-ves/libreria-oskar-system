const { normalizarIsbnEstricto, hasValidIsbnChecksum } = require('../../utils/isbn');

const validateIsbn = (isbn, errors, { required = true } = {}) => {
  if (isbn === undefined || isbn === null || (typeof isbn === 'string' && !isbn.trim())) {
    if (required) {
      errors.push('El campo "isbn" es obligatorio y debe ser una cadena no vacía.');
    }
    return;
  }

  if (typeof isbn !== 'string') {
    errors.push('El campo "isbn" debe ser una cadena de texto.');
    return;
  }

  const normalized = normalizarIsbnEstricto(isbn);
  if (normalized.length > 20) {
    errors.push('El campo "isbn" no puede superar los 20 caracteres después de normalizarse.');
    return;
  }

  if (!hasValidIsbnChecksum(normalized)) {
    errors.push('El campo "isbn" debe ser un ISBN-10 o ISBN-13 válido.');
  }
};

module.exports = {
  validateIsbn,
};

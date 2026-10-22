const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');
const { validateIsbn } = require('./common');

/**
 * Valor canónico de marcador de posición para autor; debe coincidir con
 * AUTOR_PLACEHOLDER definido en googleBooks.service.js.
 */
const AUTOR_PLACEHOLDER_VALIDATOR = 'Autor de Biblioteca Internacional';

/**
 * Middleware para validar el payload de escaneo de libros.
 */
const validateEscanearLibro = (req, res, next) => {
  const { isbn, bodegaId } = req.body || {};

  const errors = [];
  validateIsbn(isbn, errors);

  if (!bodegaId) {
    errors.push('El campo "bodegaId" es obligatorio.');
  } else if (!UUID_REGEX.test(bodegaId)) {
    errors.push('El campo "bodegaId" debe ser un UUID válido.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para el escaneo.', errors));
  }

  next();
};

/**
 * Middleware para validar el payload de consulta por ISBN.
 * POST /api/libros/consultar — body: { isbn }
 */
const validateConsultarLibro = (req, res, next) => {
  const { isbn } = req.body || {};
  const errors = [];
  validateIsbn(isbn, errors);

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para la consulta.', errors));
  }

  next();
};

/**
 * Middleware para validar el payload de registro manual de un libro.
 * POST /api/libros/registrar
 * body: { isbn?, titulo, autor, editorial?, categoriaId, resena, imagenUrl?, precio?, cantidad, stockMinimo?, bodegaId }
 */
const validateRegistrarLibro = (req, res, next) => {
  const { isbn, titulo, autor, categoriaId, resena, cantidad, stockMinimo, precio, bodegaId } = req.body || {};
  const errors = [];

  // ISBN opcional; si se proporciona, validar su forma normalizada.
  validateIsbn(isbn, errors, { required: false });

  // titulo obligatorio y no vacío
  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    errors.push('El campo "titulo" es obligatorio y debe ser una cadena no vacía.');
  }

  // autor obligatorio, no vacío y distinto del nombre de placeholder canónico
  if (!autor || typeof autor !== 'string' || autor.trim() === '') {
    errors.push('El campo "autor" es obligatorio y debe ser una cadena no vacía.');
  } else if (autor.trim() === AUTOR_PLACEHOLDER_VALIDATOR) {
    errors.push(`El campo "autor" no puede ser el valor de marcador de posición ("${AUTOR_PLACEHOLDER_VALIDATOR}"). Ingresa el nombre real del autor.`);
  }

  // resena obligatoria y no vacía
  if (!resena || typeof resena !== 'string' || resena.trim() === '') {
    errors.push('El campo "resena" es obligatorio y debe ser una cadena no vacía.');
  }

  // cantidad: entero >= 1
  const cantidadNum = Number(cantidad);
  if (cantidad === undefined || cantidad === null || cantidad === '') {
    errors.push('El campo "cantidad" es obligatorio.');
  } else if (!Number.isInteger(cantidadNum) || cantidadNum < 1) {
    errors.push('El campo "cantidad" debe ser un número entero mayor o igual a 1.');
  }

  // stockMinimo: entero >= 0, default 5 (se aplica en el service si no viene)
  if (stockMinimo !== undefined && stockMinimo !== null && stockMinimo !== '') {
    const smNum = Number(stockMinimo);
    if (!Number.isInteger(smNum) || smNum < 0) {
      errors.push('El campo "stockMinimo" debe ser un número entero mayor o igual a 0.');
    }
  }

  // precio: numérico >= 0, default 0 (se aplica en el service si no viene)
  if (precio !== undefined && precio !== null && precio !== '') {
    const precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum < 0) {
      errors.push('El campo "precio" debe ser un número mayor o igual a 0.');
    }
  }

  // bodegaId obligatorio y UUID válido
  if (!bodegaId) {
    errors.push('El campo "bodegaId" es obligatorio.');
  } else if (!UUID_REGEX.test(bodegaId)) {
    errors.push('El campo "bodegaId" debe ser un UUID válido.');
  }

  // categoriaId obligatorio y UUID válido
  if (!categoriaId || (typeof categoriaId === 'string' && categoriaId.trim() === '')) {
    errors.push('El campo "categoriaId" es obligatorio.');
  } else if (!UUID_REGEX.test(categoriaId)) {
    errors.push('El campo "categoriaId" debe ser un UUID válido.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para el registro del libro.', errors));
  }

  next();
};

/**
 * Middleware para validar el payload de ingreso de mercancía a un libro existente.
 * POST /api/libros/:id/ingreso — body: { bodegaId, cantidad }
 */
const validateIngresoLibro = (req, res, next) => {
  const { id } = req.params || {};
  const { bodegaId, cantidad } = req.body || {};
  const errors = [];

  // :id debe ser UUID válido
  if (!id || !UUID_REGEX.test(id)) {
    errors.push('El parámetro "id" del libro debe ser un UUID válido.');
  }

  // bodegaId obligatorio y UUID válido
  if (!bodegaId) {
    errors.push('El campo "bodegaId" es obligatorio.');
  } else if (!UUID_REGEX.test(bodegaId)) {
    errors.push('El campo "bodegaId" debe ser un UUID válido.');
  }

  // cantidad: entero >= 1
  const cantidadNum = Number(cantidad);
  if (cantidad === undefined || cantidad === null || cantidad === '') {
    errors.push('El campo "cantidad" es obligatorio.');
  } else if (!Number.isInteger(cantidadNum) || cantidadNum < 1) {
    errors.push('El campo "cantidad" debe ser un número entero mayor o igual a 1.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para el ingreso.', errors));
  }

  next();
};

module.exports = {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
  AUTOR_PLACEHOLDER_VALIDATOR,
};

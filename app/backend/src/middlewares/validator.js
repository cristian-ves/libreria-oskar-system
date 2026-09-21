const { ValidationError } = require('../utils/errors');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valor canónico de marcador de posición para autor; debe coincidir con
 * AUTOR_PLACEHOLDER definido en googleBooks.service.js.
 */
const AUTOR_PLACEHOLDER_VALIDATOR = 'Autor de Biblioteca Internacional';

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

/**
 * Middleware para validar el payload de consulta por ISBN.
 * POST /api/libros/consultar — body: { isbn }
 */
const validateConsultarLibro = (req, res, next) => {
  const { isbn } = req.body || {};
  const errors = [];

  if (!isbn || typeof isbn !== 'string' || isbn.trim() === '') {
    errors.push('El campo "isbn" es obligatorio y debe ser una cadena no vacía.');
  }

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

  // isbn es opcional: si viene, debe ser string no vacío
  if (isbn !== undefined && isbn !== null && isbn !== '') {
    if (typeof isbn !== 'string') {
      errors.push('El campo "isbn", si se proporciona, debe ser una cadena de texto.');
    }
  }

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
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
  validateListarInventario,
  validateListarMovimientos,
  validateSalidaInventario,
  validateAjusteInventario,
};

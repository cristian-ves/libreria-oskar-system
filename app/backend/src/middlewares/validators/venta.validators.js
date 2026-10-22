const { ValidationError } = require('../../utils/errors');
const { UUID_REGEX } = require('../../utils/uuid');
const { aCentavos, MAX_CENTAVOS, rangoFechasNegocio } = require('../../utils/ventas');

const MAX_ITEMS = 50;
const MAX_CANTIDAD = 2147483647;
const METODOS_PAGO = ['Efectivo', 'Transferencia'];
const ESTADOS = ['Completada', 'Anulada'];

const esUuid = (valor) => typeof valor === 'string' && UUID_REGEX.test(valor);
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const ausente = (valor) => valor === undefined || valor === null;

const validarTextoOpcional = (valor, campo, max, errors) => {
  if (ausente(valor)) return;
  if (typeof valor !== 'string') {
    errors.push(`El campo "${campo}" debe ser una cadena de texto.`);
  } else if (valor.length > max) {
    errors.push(`El campo "${campo}" no puede superar los ${max} caracteres.`);
  }
};

const validarItems = (items, errors) => {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) {
    errors.push(`El campo "items" debe ser un arreglo de 1 a ${MAX_ITEMS} elementos.`);
    return;
  }

  const vistos = new Set();
  items.forEach((item, i) => {
    const pos = `items[${i}]`;
    if (!esObjeto(item)) {
      errors.push(`El elemento ${pos} debe ser un objeto con "libroId" y "cantidad".`);
      return;
    }
    if (!esUuid(item.libroId)) {
      errors.push(`El campo "${pos}.libroId" debe ser un UUID válido.`);
    } else if (vistos.has(item.libroId.toLowerCase())) {
      errors.push(`El libro de ${pos} está repetido: usa la cantidad en lugar de repetir el libro.`);
    } else {
      vistos.add(item.libroId.toLowerCase());
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > MAX_CANTIDAD) {
      errors.push(`El campo "${pos}.cantidad" debe ser un entero entre 1 y ${MAX_CANTIDAD}.`);
    }
  });
};

const validarDescuento = (descuento, errors) => {
  if (ausente(descuento)) return;
  try {
    if (aCentavos(descuento) > MAX_CENTAVOS) throw new Error('fuera de rango');
  } catch (e) {
    errors.push('El campo "descuento" debe ser un número mayor o igual a 0, con máximo 2 decimales y menor a 100000000.');
  }
};

/**
 * POST /api/ventas — body: { bodegaId, items, metodoPago, clienteNombre?, clienteNit?, descuento?, notas? }
 */
const validateCrearVenta = (req, res, next) => {
  const body = esObjeto(req.body) ? req.body : {};
  const errors = [];

  if (!esUuid(body.bodegaId)) {
    errors.push('El campo "bodegaId" debe ser un UUID válido.');
  }
  validarItems(body.items, errors);
  if (!METODOS_PAGO.includes(body.metodoPago)) {
    errors.push(`El campo "metodoPago" debe ser uno de: ${METODOS_PAGO.join(', ')}.`);
  }
  validarTextoOpcional(body.clienteNombre, 'clienteNombre', 150, errors);
  validarTextoOpcional(body.clienteNit, 'clienteNit', 20, errors);
  validarTextoOpcional(body.notas, 'notas', 1000, errors);
  validarDescuento(body.descuento, errors);

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para registrar la venta.', errors));
  }
  next();
};

const validarEnteroQuery = (valor, campo, min, max, errors) => {
  if (ausente(valor) || valor === '') return;
  const valido = typeof valor === 'string' && /^\d+$/.test(valor) && Number(valor) >= min && Number(valor) <= max;
  if (!valido) {
    errors.push(`El parámetro "${campo}" debe ser un número entero entre ${min} y ${max}.`);
  }
};

/**
 * GET /api/ventas?estado=&desde=&hasta=&limit=&offset=
 */
const validateListarVentas = (req, res, next) => {
  const { estado, desde, hasta, limit, offset } = esObjeto(req.query) ? req.query : {};
  const errors = [];

  if (!ausente(estado) && estado !== '' && !ESTADOS.includes(estado)) {
    errors.push(`El parámetro "estado" no es válido. Opciones permitidas: ${ESTADOS.join(', ')}.`);
  }
  validarEnteroQuery(limit, 'limit', 1, 200, errors);
  validarEnteroQuery(offset, 'offset', 0, MAX_CANTIDAD, errors);

  try {
    rangoFechasNegocio(desde, hasta);
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    return next(new ValidationError('Parámetros de consulta inválidos para ventas.', errors));
  }
  next();
};

/**
 * GET /api/ventas/:id
 */
const validateVentaId = (req, res, next) => {
  if (!esUuid((req.params || {}).id)) {
    return next(new ValidationError('Parámetros inválidos para consultar la venta.', [
      'El parámetro "id" de venta debe ser un UUID válido.',
    ]));
  }
  next();
};

/**
 * POST /api/ventas/:id/anular — body: { motivo }
 */
const validateAnularVenta = (req, res, next) => {
  const { motivo } = esObjeto(req.body) ? req.body : {};
  const errors = [];

  if (!esUuid((req.params || {}).id)) {
    errors.push('El parámetro "id" de venta debe ser un UUID válido.');
  }
  if (typeof motivo !== 'string' || !motivo.trim()) {
    errors.push('El campo "motivo" es obligatorio y debe ser una cadena no vacía.');
  } else if (motivo.trim().length > 500) {
    errors.push('El campo "motivo" no puede superar los 500 caracteres.');
  }

  if (errors.length > 0) {
    return next(new ValidationError('Datos de entrada inválidos para anular la venta.', errors));
  }
  next();
};

module.exports = {
  validateCrearVenta,
  validateListarVentas,
  validateVentaId,
  validateAnularVenta,
};

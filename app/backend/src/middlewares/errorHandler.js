const {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError: SequelizeValidationError,
} = require('sequelize');
const {
  AppError,
  ValidationError,
} = require('../utils/errors');

const ERROR_MESSAGES = {
  internal: 'Error interno del servidor.',
  unique: 'El recurso ya existe.',
  reference: 'La referencia indicada no es válida.',
  validation: 'Los datos enviados no son válidos.',
  businessRule: 'La operación no puede completarse por una regla de negocio.',
};

const getDatabaseCode = (err) => err?.code || err?.original?.code || err?.parent?.code || null;

/**
 * Middleware centralizado de manejo de errores de la API.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = ERROR_MESSAGES.internal;
  let details = null;
  const databaseCode = getDatabaseCode(err);

  if (err?.code === 'CORS_ORIGIN_DENIED') {
    statusCode = 403;
    message = 'Origen no autorizado.';
  } else if (err?.type === 'entity.too.large' || err?.status === 413) {
    statusCode = 413;
    message = 'El cuerpo de la solicitud supera el tamaño permitido.';
  } else if (err instanceof SyntaxError && err?.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
    statusCode = 400;
    message = 'El JSON enviado no es válido.';
  } else if (err instanceof AppError && err.statusCode < 500) {
    statusCode = err.statusCode;
    message = err.message;
    // Los detalles de errores de aplicación provienen de validaciones propias.
    details = err instanceof ValidationError ? err.details : null;
  } else if (err instanceof UniqueConstraintError || databaseCode === '23505') {
    statusCode = 409;
    message = ERROR_MESSAGES.unique;
  } else if (err instanceof ForeignKeyConstraintError || databaseCode === '23503') {
    statusCode = 400;
    message = ERROR_MESSAGES.reference;
  } else if (err instanceof SequelizeValidationError || databaseCode === '22P02') {
    statusCode = 400;
    message = ERROR_MESSAGES.validation;
  } else if (databaseCode === 'P0001') {
    statusCode = 400;
    message = ERROR_MESSAGES.businessRule;
  }

  // No registrar mensajes, SQL, parámetros, detalles ni objetos de Sequelize/pg.
  const safeLog = {
    name: err?.name || 'Error',
    ...(databaseCode ? { code: databaseCode } : {}),
    ...(req.method ? { method: req.method } : {}),
  };
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR ${statusCode}]`, safeLog);
  } else {
    console.warn(`[CLIENT WARNING ${statusCode}]`, safeLog);
  }

  const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };

  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

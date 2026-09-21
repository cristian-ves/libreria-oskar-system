const env = require('../config/env');

/**
 * Middleware centralizado de manejo de errores de la API.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details || null;

  // Manejo de errores específicos de PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'Violación de restricción única en la base de datos.';
        details = err.detail;
        break;
      case '23503': // foreign_key_violation
        statusCode = 400;
        message = 'Referencia inválida: la entidad relacionada no existe en la base de datos.';
        details = err.detail;
        break;
      case '22P02': // invalid_text_representation
        statusCode = 400;
        message = 'Formato de identificador (UUID) o tipo de dato inválido.';
        details = err.message;
        break;
      case 'P0001': // raise_exception desde triggers PL/pgSQL
        statusCode = 400;
        message = `Error de regla de negocio en base de datos: ${err.message}`;
        break;
      default:
        break;
    }
  }

  // Registro de errores para trazabilidad
  if (statusCode >= 500) {
    console.error('[SERVER ERROR 500]:', err);
  } else {
    console.warn(`[CLIENT WARNING ${statusCode}]:`, message, details || '');
  }

  const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };

  if (details) {
    response.details = details;
  }

  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

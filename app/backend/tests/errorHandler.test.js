const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  UniqueConstraintError,
  ValidationError: SequelizeValidationError,
} = require('sequelize');
const errorHandler = require('../src/middlewares/errorHandler');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../src/utils/errors');

function invokeErrorHandler(error) {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  errorHandler(error, { method: 'POST' }, response, () => {});
  return response;
}

test('errorHandler conserva formato y códigos de errores controlados por la aplicación', () => {
  const cases = [
    [new ValidationError('Entrada inválida', ['Campo requerido']), 400, 'Entrada inválida'],
    [new UnauthorizedError('No autorizado'), 401, 'No autorizado'],
    [new ForbiddenError('Acceso denegado'), 403, 'Acceso denegado'],
    [new NotFoundError('No encontrado'), 404, 'No encontrado'],
    [new ConflictError('Conflicto'), 409, 'Conflicto'],
  ];

  for (const [error, expectedStatus, expectedMessage] of cases) {
    const response = invokeErrorHandler(error);
    assert.equal(response.statusCode, expectedStatus);
    assert.equal(response.body.status, 'fail');
    assert.equal(response.body.message, expectedMessage);
    assert.equal('stack' in response.body, false);
  }

  assert.deepEqual(invokeErrorHandler(cases[0][0]).body.details, ['Campo requerido']);
});

test('errorHandler mapea errores UNIQUE de Sequelize sin exponer campos internos', () => {
  const error = new UniqueConstraintError({
    message: 'duplicate key value violates unique constraint "libros_isbn_key"',
    errors: [],
    fields: { isbn: 'PRIVATE-ISBN-VALUE' },
  });

  const response = invokeErrorHandler(error);
  const serialized = JSON.stringify(response.body);
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.status, 'fail');
  assert.equal(response.body.message, 'El recurso ya existe.');
  assert.equal('details' in response.body, false);
  assert.doesNotMatch(serialized, /libros_isbn_key|PRIVATE-ISBN-VALUE|SQL|constraint/i);
});

test('errorHandler conserva errores de validación Sequelize como HTTP 400 genérico', () => {
  const error = new SequelizeValidationError('invalid input', [
    { message: 'private value rejected', path: 'isbn', value: 'PRIVATE-ISBN-VALUE' },
  ]);

  const response = invokeErrorHandler(error);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Los datos enviados no son válidos.');
  assert.doesNotMatch(JSON.stringify(response.body), /private value|PRIVATE-ISBN-VALUE|isbn/i);
});

test('errorHandler oculta SQL, parámetros, detalle y stack de errores PostgreSQL inesperados', () => {
  const internalError = {
    name: 'SequelizeDatabaseError',
    message: 'syntax error near PRIVATE-PARAMETER',
    code: '42601',
    detail: 'PRIVATE-DETAIL',
    sql: 'SELECT * FROM private_table WHERE token = PRIVATE-PARAMETER',
    stack: 'STACK-SECRET',
    parent: { code: '42601', detail: 'PRIVATE-DETAIL' },
  };
  const logged = [];
  const previousError = console.error;
  const previousWarn = console.warn;
  console.error = (...values) => logged.push(values);
  console.warn = (...values) => logged.push(values);

  let response;
  try {
    response = invokeErrorHandler(internalError);
  } finally {
    console.error = previousError;
    console.warn = previousWarn;
  }

  const clientOutput = JSON.stringify(response.body);
  const serverLog = JSON.stringify(logged);
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { status: 'error', message: 'Error interno del servidor.' });
  for (const internalValue of ['PRIVATE-PARAMETER', 'PRIVATE-DETAIL', 'private_table', 'STACK-SECRET']) {
    assert.doesNotMatch(clientOutput, new RegExp(internalValue, 'i'));
    assert.doesNotMatch(serverLog, new RegExp(internalValue, 'i'));
  }
});

test('errorHandler asigna mensajes seguros a códigos PostgreSQL conocidos', () => {
  const unique = invokeErrorHandler({ code: '23505', detail: 'private constraint value' });
  const reference = invokeErrorHandler({ parent: { code: '23503', detail: 'private table' } });

  assert.equal(unique.statusCode, 409);
  assert.equal(reference.statusCode, 400);
  assert.doesNotMatch(JSON.stringify(unique.body), /private/i);
  assert.doesNotMatch(JSON.stringify(reference.body), /private/i);
});

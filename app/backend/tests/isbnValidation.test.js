const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
} = require('../src/middlewares/validator');
const errorHandler = require('../src/middlewares/errorHandler');
const googleBooksService = require('../src/services/googleBooks.service');

const VALID_UUID = '5a215402-f1fb-45a2-b20c-a5816e0445a0';

function validate(middleware, req) {
  let validationError = null;
  let nextCalled = false;
  middleware(req, {}, (error) => {
    validationError = error || null;
    nextCalled = true;
  });

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

  if (validationError) {
    errorHandler(validationError, { method: 'POST' }, response, () => {});
  }
  return { validationError, nextCalled, response };
}

test('acepta ISBN-13 válido para escaneo y consulta', () => {
  const scan = validate(validateEscanearLibro, {
    body: { isbn: '9780135957059', bodegaId: VALID_UUID, usuarioId: VALID_UUID },
  });
  const lookup = validate(validateConsultarLibro, { body: { isbn: '9780135957059' } });

  assert.equal(scan.validationError, null);
  assert.equal(lookup.validationError, null);
  assert.equal(scan.nextCalled, true);
  assert.equal(lookup.nextCalled, true);
});

test('rechaza ISBN normalizados de más de 20 caracteres con HTTP 400', () => {
  const result = validate(validateConsultarLibro, { body: { isbn: '123456789012345678901' } });

  assert.equal(result.response.statusCode, 400);
  assert.equal(result.response.body.status, 'fail');
  assert.match(result.response.body.message, /inválidos/i);
  assert.match(result.response.body.details.join(' '), /20 caracteres/);
});

test('rechaza ISBN con formato inválido y permite ISBN-10/13 tras normalizar separadores', () => {
  const invalid = validate(validateConsultarLibro, { body: { isbn: '978-ABC' } });
  const invalidChecksum = validate(validateConsultarLibro, { body: { isbn: '9780135957058' } });
  const formattedIsbn13 = validate(validateConsultarLibro, { body: { isbn: ' 978-0-13-595705-9 ' } });
  const formattedIsbn10 = validate(validateRegistrarLibro, {
    body: { isbn: '0-13-235088-2', titulo: 'Libro', autor: 'Autor', resena: 'Reseña', cantidad: 1,
      stockMinimo: 0, bodegaId: VALID_UUID, categoriaId: VALID_UUID },
  });

  assert.equal(invalid.response.statusCode, 400);
  assert.equal(invalidChecksum.response.statusCode, 400);
  assert.match(invalid.response.body.details.join(' '), /ISBN-10 o ISBN-13 válido/);
  assert.equal(formattedIsbn13.validationError, null);
  assert.equal(formattedIsbn10.validationError, null);
  assert.equal(googleBooksService.normalizarIsbn(' 978-0-13-595705-9 '), '9780135957059');
});

test('registro manual mantiene ISBN opcional pero valida el valor si se proporciona', () => {
  const withoutIsbn = validate(validateRegistrarLibro, {
    body: { titulo: 'Libro', autor: 'Autor', resena: 'Reseña', cantidad: 1,
      stockMinimo: 0, bodegaId: VALID_UUID, categoriaId: VALID_UUID },
  });
  const invalidIsbn = validate(validateRegistrarLibro, {
    body: { isbn: 'abc', titulo: 'Libro', autor: 'Autor', resena: 'Reseña', cantidad: 1,
      stockMinimo: 0, bodegaId: VALID_UUID, categoriaId: VALID_UUID },
  });

  assert.equal(withoutIsbn.validationError, null);
  assert.equal(invalidIsbn.response.statusCode, 400);
});

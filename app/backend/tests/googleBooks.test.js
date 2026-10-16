const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const googleBooksService = require('../src/services/googleBooks.service');
const {
  jsonResponse,
  mockExternalFetch,
  googleBooksResponse,
} = require('./helpers/httpMocks');

const CLEAN_CODE_ISBN = '9780132350884';
const UNKNOWN_VALID_ISBN = '9780000000002';

afterEach(() => googleBooksService.cache.clear());

test('GoogleBooksService normaliza separadores y maneja entradas vacías', () => {
  assert.equal(googleBooksService.normalizarIsbn(' 978-0-13-235088-4 '), CLEAN_CODE_ISBN);
  assert.equal(googleBooksService.normalizarIsbn(''), '');
  assert.equal(googleBooksService.normalizarIsbn(null), '');
  assert.equal(googleBooksService.normalizarIsbn(undefined), '');
});

test('GoogleBooksService retorna un libro encontrado en Google Books', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    assert.equal(url.hostname, 'www.googleapis.com');
    assert.equal(url.searchParams.get('q'), `isbn:${CLEAN_CODE_ISBN}`);
    return googleBooksResponse(CLEAN_CODE_ISBN);
  });

  const book = await googleBooksService.buscarPorIsbn(CLEAN_CODE_ISBN);
  assert.equal(book.isbn, CLEAN_CODE_ISBN);
  assert.equal(book.titulo, 'Libro fixture de Google');
  assert.equal(book.autor, 'Autora de prueba');
  assert.equal(book.fuente, 'Google Books API');
  assert.equal(calls.length, 1);
});

test('GoogleBooksService retorna null si el ISBN no existe en los proveedores', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return jsonResponse({ items: [] });
    if (url.hostname === 'openlibrary.org') return new Response('Not found', { status: 404 });
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN);
  assert.equal(book, null);
  assert.deepEqual(calls.map(({ url }) => url.hostname), ['www.googleapis.com', 'openlibrary.org']);
});

test('GoogleBooksService usa Open Library después de HTTP 429 de Google Books', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return jsonResponse({ error: { message: 'quota fixture' } }, 429);
    if (url.hostname === 'openlibrary.org') {
      return jsonResponse({
        title: 'Libro de Open Library',
        publishers: ['Editorial Open Library'],
        description: 'Descripción del fixture Open Library.',
      });
    }
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN);
  assert.equal(book.titulo, 'Libro de Open Library');
  assert.equal(book.fuente, 'OpenLibrary Fallback');
  assert.deepEqual(calls.map(({ url }) => url.hostname), ['www.googleapis.com', 'openlibrary.org']);
});

test('GoogleBooksService maneja HTTP 500 y conserva solo contingencia catalogada conocida', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return new Response('provider error', { status: 500 });
    if (url.hostname === 'openlibrary.org') return new Response('provider error', { status: 500 });
    return undefined;
  });

  const knownBook = await googleBooksService.buscarPorIsbn(CLEAN_CODE_ISBN);
  assert.equal(knownBook.titulo, 'Clean Code: A Handbook of Agile Software Craftsmanship');
  assert.equal(knownBook.fuente, 'Catálogo Bibliográfico de Respaldo');
  assert.equal(calls.length, 2);
});

test('GoogleBooksService recupera un timeout de Google usando Open Library', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') {
      throw new DOMException('timeout fixture', 'TimeoutError');
    }
    if (url.hostname === 'openlibrary.org') return jsonResponse({ title: 'Respuesta después del timeout' });
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN);
  assert.equal(book.titulo, 'Respuesta después del timeout');
  assert.equal(book.fuente, 'OpenLibrary Fallback');
  assert.equal(calls.length, 2);
});

test('GoogleBooksService conserva valores de respaldo para una respuesta incompleta', async (t) => {
  mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') {
      return jsonResponse({ items: [{ volumeInfo: { title: 'Título parcial', authors: [] } }] });
    }
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN);
  assert.equal(book.titulo, 'Título parcial');
  assert.equal(book.autor, 'Autor de Biblioteca Internacional');
  assert.equal(book.editorial, 'Editorial Desconocida');
  assert.equal(book.resena, 'Título parcial. Obra publicada por Editorial Desconocida.');
});

test('GoogleBooksService continúa con Open Library si Google devuelve JSON inválido', async (t) => {
  mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return new Response('{ invalid json', { status: 200 });
    if (url.hostname === 'openlibrary.org') return jsonResponse({ title: 'Respuesta Open Library JSON inválido' });
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN);
  assert.equal(book.titulo, 'Respuesta Open Library JSON inválido');
  assert.equal(book.fuente, 'OpenLibrary Fallback');
});

test('GoogleBooksService usa contingencia catalogada ante error de conexión de ambas APIs', async (t) => {
  const calls = mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com' || url.hostname === 'openlibrary.org') {
      throw new TypeError('connection fixture failure');
    }
    return undefined;
  });

  const book = await googleBooksService.buscarPorIsbn(CLEAN_CODE_ISBN);
  assert.equal(book.titulo, 'Clean Code: A Handbook of Agile Software Craftsmanship');
  assert.equal(book.fuente, 'Catálogo Bibliográfico de Respaldo');
  assert.equal(calls.length, 2);
});

test('GoogleBooksService deja el registro manual cuando ambas APIs fallan para ISBN no catalogado', async (t) => {
  mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') throw new TypeError('connection fixture failure');
    if (url.hostname === 'openlibrary.org') throw new TypeError('connection fixture failure');
    return undefined;
  });

  assert.equal(await googleBooksService.buscarPorIsbn(UNKNOWN_VALID_ISBN), null);
});

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const googleBooksService = require('../src/services/googleBooks.service');
const { jsonResponse, mockExternalFetch, googleBooksResponse } = require('./helpers/httpMocks');

const ISBN_DESCONOCIDO = '9780000000002';
const ISBN_DON_QUIJOTE = '9788424116286'; // catálogo de respaldo, sin portada
const ISBN_CLEAN_CODE = '9780132350884'; // catálogo de respaldo, con portada
const CINCO = ['titulo', 'autor', 'editorial', 'resena', 'imagen_url'];

afterEach(() => googleBooksService.cache.clear());

// Con Google sin items y OpenLibrary 404 se cae al catálogo; con `openLibrary` se simula esa fuente.
const simular = (t, { google, openLibrary }) => mockExternalFetch(t, async (url) => {
  if (url.hostname === 'www.googleapis.com') return google(); // un Response nuevo por llamada
  if (url.hostname === 'openlibrary.org' && url.pathname.startsWith('/isbn/')) {
    return openLibrary || new Response('Not found', { status: 404 });
  }
  if (url.hostname === 'openlibrary.org') return new Response('Not found', { status: 404 });
  return undefined;
});

test('ruta Google con respuesta parcial: relleno con los 5 campos', async (t) => {
  simular(t, { google: () => jsonResponse({ items: [{ volumeInfo: {} }] }) });
  const libro = await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO);
  assert.equal(libro.fuente, 'Google Books API');
  assert.deepEqual(libro.relleno, CINCO);
});

test('ruta Google con imageLinks vacío cuenta la portada como relleno', async (t) => {
  simular(t, { google: () => googleBooksResponse(ISBN_DESCONOCIDO, { imageLinks: {} }) });
  assert.deepEqual((await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO)).relleno, ['imagen_url']);
});

test('ruta Google con respuesta completa: relleno vacío', async (t) => {
  simular(t, { google: () => googleBooksResponse(ISBN_DESCONOCIDO, { imageLinks: { thumbnail: 'http://x.test/a.jpg' } }) });
  const libro = await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO);
  assert.deepEqual(libro.relleno, []);
  assert.equal(libro.imagen_url, 'https://x.test/a.jpg');
});

test('ruta OpenLibrary con respuesta parcial: relleno con los 5 campos', async (t) => {
  simular(t, { google: () => jsonResponse({ items: [] }), openLibrary: jsonResponse({}) });
  const libro = await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO);
  assert.equal(libro.fuente, 'OpenLibrary Fallback');
  assert.deepEqual(libro.relleno, CINCO);
});

test('ruta OpenLibrary con respuesta completa: relleno vacío', async (t) => {
  mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return jsonResponse({ items: [] });
    if (url.pathname.startsWith('/isbn/')) {
      return jsonResponse({
        title: 'T', publishers: ['P'], description: { value: 'D' }, covers: [7], authors: [{ key: '/authors/OL1A' }],
      });
    }
    if (url.pathname === '/authors/OL1A.json') return jsonResponse({ name: 'Autora Real' });
    return undefined;
  });
  const libro = await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO);
  assert.equal(libro.autor, 'Autora Real');
  assert.deepEqual(libro.relleno, []);
});

test('OpenLibrary: si el autor no se puede resolver queda en relleno', async (t) => {
  mockExternalFetch(t, async (url) => {
    if (url.hostname === 'www.googleapis.com') return jsonResponse({ items: [] });
    if (url.pathname.startsWith('/isbn/')) {
      return jsonResponse({ title: 'T', publishers: ['P'], description: 'D', covers: [7], authors: [{ key: '/authors/OL1A' }] });
    }
    return new Response('x', { status: 500 });
  });
  assert.deepEqual((await googleBooksService.buscarPorIsbn(ISBN_DESCONOCIDO)).relleno, ['autor']);
});

test('catálogo de respaldo: sin portada → [imagen_url]; con portada → []', async (t) => {
  simular(t, { google: () => jsonResponse({ items: [] }) });
  assert.deepEqual((await googleBooksService.buscarPorIsbn(ISBN_DON_QUIJOTE)).relleno, ['imagen_url']);
  assert.deepEqual((await googleBooksService.buscarPorIsbn(ISBN_CLEAN_CODE)).relleno, []);
});

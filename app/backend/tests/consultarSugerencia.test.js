const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../src/models');
const libroService = require('../src/services/libro.service');
const googleBooksService = require('../src/services/googleBooks.service');
const { crearEntorno, isbn13 } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');
const { mockExternalFetch, googleBooksResponse, jsonResponse } = require('./helpers/httpMocks');

const original = googleBooksService.buscarPorIsbn;
const ISBN = isbn13(987654321); // no existe en la BD de pruebas
let env;
let http;

before(async () => {
  env = await crearEntorno('csug');
  http = await levantarApi(env);
});

after(async () => {
  try {
    await http.cerrar();
    await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

afterEach(() => {
  googleBooksService.buscarPorIsbn = original;
  googleBooksService.cache.clear();
});

const simulado = (extra = {}) => ({
  isbn: ISBN, titulo: 'T real', autor: 'Autor genérico', editorial: 'Editorial genérica',
  resena: 'Reseña genérica', imagen_url: null, precio: 9, fuente: 'Google Books API', ...extra,
});
const simular = (obj) => { googleBooksService.buscarPorIsbn = async () => obj; };

test('con relleno: campos vacíos y campos_faltantes en orden canónico terminando en categoria', async () => {
  simular(simulado({ relleno: ['imagen_url', 'autor', 'resena'] }));
  const { existe, sugerencia } = await libroService.consultarLibro({ isbn: ISBN });
  assert.equal(existe, false);
  assert.deepEqual(sugerencia, {
    isbn: ISBN, titulo: 'T real', autor: '', editorial: 'Editorial genérica', resena: '', imagen_url: null,
    fuente: 'Google Books API', campos_faltantes: ['autor', 'resena', 'imagen_url', 'categoria'],
  });
  assert.equal('precio' in sugerencia, false);
});

test('relleno completo vacía los 5 campos', async () => {
  simular(simulado({ relleno: ['titulo', 'autor', 'editorial', 'resena', 'imagen_url'], imagen_url: 'x' }));
  const { sugerencia } = await libroService.consultarLibro({ isbn: ISBN });
  assert.deepEqual(
    [sugerencia.titulo, sugerencia.autor, sugerencia.editorial, sugerencia.resena, sugerencia.imagen_url],
    ['', '', '', '', null]
  );
  assert.deepEqual(sugerencia.campos_faltantes, ['titulo', 'autor', 'editorial', 'resena', 'imagen_url', 'categoria']);
});

test('relleno vacío o ausente: solo categoria y valores intactos', async () => {
  for (const obj of [simulado({ relleno: [] }), simulado()]) {
    simular(obj);
    const { sugerencia } = await libroService.consultarLibro({ isbn: ISBN });
    assert.deepEqual(sugerencia.campos_faltantes, ['categoria']);
    assert.equal(sugerencia.autor, 'Autor genérico');
    assert.equal(sugerencia.resena, 'Reseña genérica');
  }
});

test('no muta el objeto simulado ni su relleno y dos llamadas devuelven lo mismo', async () => {
  const obj = simulado({ relleno: ['autor', 'imagen_url'] });
  const copia = structuredClone(obj);
  simular(obj);
  const a = await libroService.consultarLibro({ isbn: ISBN });
  const b = await libroService.consultarLibro({ isbn: ISBN });
  assert.deepEqual(obj, copia);
  assert.deepEqual(a, b);
  assert.notEqual(a.sugerencia.campos_faltantes, obj.relleno);
});

test('el objeto del caché real tampoco queda mutado', async (t) => {
  mockExternalFetch(t, async (url) => (url.hostname === 'www.googleapis.com'
    ? jsonResponse({ items: [{ volumeInfo: { title: 'Solo título' } }] })
    : undefined));
  await libroService.consultarLibro({ isbn: ISBN });
  const cacheado = googleBooksService.cache.get(ISBN).data;
  assert.equal(cacheado.autor, 'Autor de Biblioteca Internacional');
  assert.deepEqual(cacheado.relleno, ['autor', 'editorial', 'resena', 'imagen_url']);
});

test('sugerencia null si buscarPorIsbn devuelve null o lanza', async () => {
  simular(null);
  assert.deepEqual(await libroService.consultarLibro({ isbn: ISBN }), { existe: false, sugerencia: null });
  googleBooksService.buscarPorIsbn = async () => { throw new Error('caída simulada'); };
  assert.deepEqual(await libroService.consultarLibro({ isbn: ISBN }), { existe: false, sugerencia: null });
});

test('libro existente: existe true, sin sugerencia ni campos_faltantes', async () => {
  const { libro } = await env.crearLibro({ stock: 1 });
  googleBooksService.buscarPorIsbn = async () => { throw new Error('no debe consultarse'); };
  const res = await libroService.consultarLibro({ isbn: libro.isbn });
  assert.equal(res.existe, true);
  assert.equal('sugerencia' in res, false);
  assert.equal('campos_faltantes' in res, false);
});

test('HTTP POST /libros/consultar: 401 sin token, 403 rol Usuario, 400 sin ISBN o inválido', async () => {
  const { api, tokens } = http;
  const body = { isbn: ISBN };
  assert.equal((await api('POST', '/libros/consultar', { body })).status, 401);
  assert.equal((await api('POST', '/libros/consultar', { token: tokens.usuario, body })).status, 403);
  assert.equal((await api('POST', '/libros/consultar', { token: tokens.empleado, body: {} })).status, 400);
  assert.equal((await api('POST', '/libros/consultar', { token: tokens.empleado, body: { isbn: '123' } })).status, 400);
});

test('HTTP POST /libros/consultar: 200 con la forma nueva de la sugerencia', async (t) => {
  mockExternalFetch(t, async (url) => (url.hostname === 'www.googleapis.com'
    ? googleBooksResponse(ISBN, { authors: [], imageLinks: { thumbnail: 'http://x.test/a.jpg' } })
    : undefined), { allowLocal: true });
  const res = await http.api('POST', '/libros/consultar', { token: http.tokens.empleado, body: { isbn: ISBN } });
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'success');
  assert.equal(res.json.data.existe, false);
  assert.deepEqual(res.json.data.sugerencia, {
    isbn: ISBN, titulo: 'Libro fixture de Google', autor: '', editorial: 'Editorial fixture',
    resena: 'Descripción proporcionada por la respuesta simulada.', imagen_url: 'https://x.test/a.jpg',
    fuente: 'Google Books API', campos_faltantes: ['autor', 'categoria'],
  });
});

const test = require('node:test');
const assert = require('node:assert');
const googleBooksService = require('../src/services/googleBooks.service');

test('GoogleBooksService - normalizarIsbn limpia correctamente guiones y espacios', () => {
  const dirtyIsbn = ' 978-0-13-235088-4 ';
  const clean = googleBooksService.normalizarIsbn(dirtyIsbn);
  assert.strictEqual(clean, '9780132350884');
});

test('GoogleBooksService - normalizarIsbn maneja entradas nulas o vacías', () => {
  assert.strictEqual(googleBooksService.normalizarIsbn(''), '');
  assert.strictEqual(googleBooksService.normalizarIsbn(null), '');
  assert.strictEqual(googleBooksService.normalizarIsbn(undefined), '');
});

test('GoogleBooksService - consulta con ISBN conocido retorna estructura de libro válida', async () => {
  // ISBN de Clean Code
  const isbn = '9780132350884';
  const libro = await googleBooksService.buscarPorIsbn(isbn);

  assert.ok(libro, 'Debe retornar un objeto de libro');
  assert.strictEqual(typeof libro.titulo, 'string');
  assert.ok(libro.titulo.length > 0);
  assert.strictEqual(typeof libro.autor, 'string');
  assert.strictEqual(typeof libro.editorial, 'string');
  assert.strictEqual(typeof libro.resena, 'string');
  assert.strictEqual(typeof libro.precio, 'number');
  assert.strictEqual(libro.isbn, isbn);
});

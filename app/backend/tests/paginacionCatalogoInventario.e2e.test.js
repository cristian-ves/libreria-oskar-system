process.env.NODE_ENV = 'test';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const seed = require('../src/database/seed');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const {
  sequelize, Libro, Autor, Categoria, Inventario, Bodega, Sucursal, Usuario, TipoMovimiento, MovimientoInventario,
} = require('../src/models');

const unique = `Pag${Date.now()}`;
const fixtures = { books: [], inventories: [], movements: [], branches: [], warehouses: [], categories: [], authors: [] };
let server;
let baseUrl;
let token;
let category;
let otherCategory;
let author;
let firstWarehouse;
let secondWarehouse;
let fixtureQuery;

before(async () => {
  const seeded = await seed();
  firstWarehouse = await Bodega.findByPk(seeded.bodegaId);
  const secondBranch = await Sucursal.create({ nombre: `Sucursal ${unique}`, direccion: 'Pruebas', telefono: null });
  fixtures.branches.push(secondBranch);
  secondWarehouse = await Bodega.create({ sucursal_id: secondBranch.id, nombre: `Bodega ${unique}`, descripcion: 'Pruebas de paginación' });
  fixtures.warehouses.push(secondWarehouse);
  category = await Categoria.create({ nombre: `Categoría ${unique}` });
  fixtures.categories.push(category);
  otherCategory = await Categoria.create({ nombre: `Categoría alternativa ${unique}` });
  fixtures.categories.push(otherCategory);
  author = await Autor.create({ nombre: `Autor ${fixtureQuery}`, biografia: 'Fixture de paginación' });
  fixtures.authors.push(author);
  fixtureQuery = `paginacion${Date.now()}`;

  const admin = await Usuario.findOne({ where: { email: 'admin@libreriaoskar.com' } });
  const ingreso = await TipoMovimiento.findOne({ where: { nombre: 'Ingreso' } });
  assert.ok(admin);
  assert.ok(ingreso);

  for (let index = 0; index < 4; index += 1) {
    const book = await Libro.create({
      titulo: `${fixtureQuery} libro ${index}`,
      isbn: `${unique}${index}`,
      resena: 'Fixture de paginación',
      categoria_id: index === 3 ? otherCategory.id : category.id,
      autor_id: author.id,
      precio: 10,
    });
    fixtures.books.push(book);
    const warehouses = index === 0 ? [firstWarehouse, secondWarehouse] : [firstWarehouse];
    for (const warehouse of warehouses) {
      const inventory = await Inventario.create({ libro_id: book.id, bodega_id: warehouse.id, stock_actual: 0, stock_minimo: 1 });
      fixtures.inventories.push(inventory);
      const movement = await movimientoRepository.createMovimiento({}, {
        inventarioId: inventory.id,
        usuarioId: admin.id,
        tipoMovimientoId: ingreso.id,
        cantidad: index === 0 ? (warehouse.id === firstWarehouse.id ? 3 : 4) : 1,
        motivoDetalle: 'Fixture de paginación',
      });
      fixtures.movements.push(await MovimientoInventario.findByPk(movement.id));
    }
  }

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@libreriaoskar.com', password: 'Admin123!' }),
  });
  assert.equal(login.status, 200);
  token = (await login.json()).data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const movement of fixtures.movements) if (movement) await movement.destroy();
  for (const inventory of fixtures.inventories) await inventory.destroy();
  for (const book of fixtures.books) await book.destroy();
  for (const warehouse of fixtures.warehouses) await warehouse.destroy();
  for (const branch of fixtures.branches) await branch.destroy();
  for (const item of fixtures.categories) await item.destroy();
  for (const item of fixtures.authors) await item.destroy();
  await sequelize.close();
});

const get = (path) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });

test('GET /libros conserva propiedades, pagina determinísticamente y cuenta filtros/stock una sola vez', async () => {
  const defaults = await (await get(`/libros?q=${fixtureQuery}`)).json();
  assert.equal(defaults.status, 'success');
  assert.equal(defaults.limit, 50);
  assert.equal(defaults.offset, 0);
  assert.equal(defaults.total, 4);
  assert.equal(defaults.results, 4);
  assert.ok(defaults.data.every((book) => book.ref && 'stock_total' in book && 'autor_nombre' in book));
  assert.equal(defaults.data.filter((book) => book.id === fixtures.books[0].id).length, 1);
  assert.equal(Number(defaults.data.find((book) => book.id === fixtures.books[0].id).stock_total), 7);
  const filteredByAuthor = await (await get(`/libros?q=${encodeURIComponent(author.nombre)}`)).json();
  assert.equal(filteredByAuthor.total, 4);

  const first = await (await get(`/libros?q=${fixtureQuery}&categoriaId=${category.id}&limit=2&offset=0`)).json();
  const second = await (await get(`/libros?q=${fixtureQuery}&categoriaId=${category.id}&limit=2&offset=2`)).json();
  const last = await (await get(`/libros?q=${fixtureQuery}&limit=2&offset=3`)).json();
  const empty = await (await get(`/libros?q=${fixtureQuery}&limit=2&offset=20`)).json();
  assert.equal(first.total, 3);
  assert.equal(first.data.length, 2);
  assert.equal(second.total, 3);
  assert.equal(second.data.length, 1);
  assert.equal(last.data.length, 1);
  assert.equal(empty.data.length, 0);
  assert.equal(empty.total, 4);
  assert.equal(new Set([...first.data, ...second.data].map((book) => book.id)).size, 3);
});

test('GET /inventario pagina pares libro/bodega, mantiene filtros y total global del filtro', async () => {
  const path = `/inventario?q=${fixtureQuery}`;
  const defaults = await (await get(path)).json();
  assert.equal(defaults.status, 'success');
  assert.equal(defaults.limit, 200);
  assert.equal(defaults.offset, 0);
  assert.equal(defaults.total, 5);
  assert.equal(defaults.data.length, 5);
  assert.ok(defaults.data.every((item) => 'bajo_stock' in item && 'obsoleto' in item && item.bodega_nombre));

  const first = await (await get(`${path}&limit=2&offset=0`)).json();
  const second = await (await get(`${path}&limit=2&offset=2`)).json();
  const last = await (await get(`${path}&limit=2&offset=4`)).json();
  const empty = await (await get(`${path}&limit=2&offset=20`)).json();
  assert.equal(first.total, 5);
  assert.equal(first.data.length, 2);
  assert.equal(second.data.length, 2);
  assert.equal(last.data.length, 1);
  assert.equal(empty.data.length, 0);
  assert.equal(empty.total, 5);
  assert.equal(new Set([...first.data, ...second.data, ...last.data].map((item) => item.inventario_id)).size, 5);

  const filtered = await (await get(`${path}&estado=bajo_stock&limit=1`)).json();
  assert.equal(filtered.total, 3);
  assert.equal(filtered.data.length, 1);
  assert.equal(filtered.data[0].stock_actual, 1);
});

test('parámetros limit/offset inválidos devuelven 400 y límites 1/200 son aceptados', async () => {
  for (const query of ['limit=0', 'limit=201', 'limit=1.5', 'limit=1&limit=2', 'offset=-1', 'offset=1.1', 'offset=abc']) {
    for (const endpoint of ['/libros', '/inventario']) {
      const response = await get(`${endpoint}?${query}`);
      assert.equal(response.status, 400, `${endpoint}?${query}`);
    }
  }
  for (const endpoint of ['/libros', '/inventario']) {
    assert.equal((await get(`${endpoint}?q=${fixtureQuery}&limit=1`)).status, 200);
    assert.equal((await get(`${endpoint}?q=${fixtureQuery}&limit=200&offset=0`)).status, 200);
  }
});

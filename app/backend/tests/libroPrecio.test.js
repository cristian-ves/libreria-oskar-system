const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const seed = require('../src/database/seed');
const inventarioRepository = require('../src/repositories/inventario.repository');
const { sequelize, Libro, Inventario, MovimientoInventario } = require('../src/models');

const UUID_INEXISTENTE = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
// ISBN-13 válido (prefijo 978) para no superar VARCHAR(20)
const ISBN_PRUEBA = '9780306406157';

let server;
let baseUrl;
let adminToken;
let employeeToken;
let libro;
let inventario;

async function login(email, password) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).data.token;
}

function patchPrecio(id, body, token) {
  return fetch(`${baseUrl}/libros/${id}/precio`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

before(async () => {
  const { bodegaId } = await seed();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}/api`;
      resolve();
    });
  });
  adminToken = await login('admin@libreriaoskar.com', 'Admin123!');
  employeeToken = await login('empleado@libreriaoskar.com', 'Empleado123!');

  await Libro.destroy({ where: { isbn: ISBN_PRUEBA } });
  libro = await Libro.create({
    titulo: 'Libro de prueba de precio',
    isbn: ISBN_PRUEBA,
    resena: 'Reseña de prueba',
    precio: 0,
  });
  inventario = await Inventario.create({
    libro_id: libro.id,
    bodega_id: bodegaId,
    stock_actual: 0,
    stock_minimo: 5,
  });
});

after(async () => {
  try {
    if (inventario) await MovimientoInventario.destroy({ where: { inventario_id: inventario.id } });
    if (inventario) await inventario.destroy();
    if (libro) await libro.destroy();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  }
});

test('PATCH /api/libros/:id/precio - sin token responde 401', async () => {
  const res = await patchPrecio(libro.id, { precio: 10 });
  assert.equal(res.status, 401);
});

test('PATCH /api/libros/:id/precio - Empleado responde 403', async () => {
  const res = await patchPrecio(libro.id, { precio: 10 }, employeeToken);
  assert.equal(res.status, 403);
});

test('PATCH /api/libros/:id/precio - :id que no es UUID responde 400', async () => {
  const res = await patchPrecio('no-es-uuid', { precio: 10 }, adminToken);
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.status, 'fail');
});

test('PATCH /api/libros/:id/precio - precios inválidos responden 400 y nunca 500', async () => {
  const casos = [
    ['ausente', {}],
    ['nulo', { precio: null }],
    ['negativo', { precio: -1 }],
    ['no numérico', { precio: 'abc' }],
    ['con 3 decimales', { precio: 10.123 }],
    ['mayor que el máximo', { precio: 100000000 }],
    ['desbordamiento numérico', { precio: 1e30 }],
  ];
  for (const [nombre, body] of casos) {
    const res = await patchPrecio(libro.id, body, adminToken);
    assert.equal(res.status, 400, `Precio ${nombre} debe responder 400`);
  }
  const intacto = await Libro.findByPk(libro.id);
  assert.equal(Number(intacto.precio), 0);
});

test('PATCH /api/libros/:id/precio - UUID válido inexistente responde 404', async () => {
  const res = await patchPrecio(UUID_INEXISTENTE, { precio: 10 }, adminToken);
  assert.equal(res.status, 404);
});

test('PATCH /api/libros/:id/precio - Administrador fija el precio sin tocar stock ni movimientos', async () => {
  const resumenAntes = await inventarioRepository.getResumen();
  const movimientosAntes = await MovimientoInventario.count();
  const stockAntes = (await Inventario.findByPk(inventario.id)).stock_actual;

  const res = await patchPrecio(libro.id, { precio: '45.50' }, adminToken);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.data.id, libro.id);
  assert.equal(Number(json.data.precio), 45.5);

  const persistido = await Libro.findByPk(libro.id);
  assert.equal(Number(persistido.precio), 45.5);

  const detalle = await fetch(`${baseUrl}/libros/${libro.id}`);
  assert.equal(detalle.status, 200);
  assert.equal(Number((await detalle.json()).data.precio), 45.5);

  const resumenDespues = await inventarioRepository.getResumen();
  assert.equal(resumenDespues.libros_sin_precio, resumenAntes.libros_sin_precio - 1);

  assert.equal(await MovimientoInventario.count(), movimientosAntes);
  assert.equal((await Inventario.findByPk(inventario.id)).stock_actual, stockAntes);
});

test('PATCH /api/libros/:id/precio - acepta 0 y el máximo permitido', async () => {
  const maximo = await patchPrecio(libro.id, { precio: 99999999.99 }, adminToken);
  assert.equal(maximo.status, 200);
  const cero = await patchPrecio(libro.id, { precio: 0 }, adminToken);
  assert.equal(cero.status, 200);
  assert.equal(Number((await cero.json()).data.precio), 0);
});

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Libro, Inventario, Bodega, Usuario, MovimientoInventario } = require('../src/models');
const db = require('../src/config/db');
const inventarioService = require('../src/services/inventario.service');
const inventarioRepository = require('../src/repositories/inventario.repository');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const inventarioController = require('../src/controllers/inventario.controller');
const { ValidationError, ConflictError } = require('../src/utils/errors');

const records = { books: [], inventories: [], movements: [] };
let bodega;
let usuario;
let salidaInventory;
let concurrencyInventory;

async function makeInventory(suffix, initialStock) {
  const book = await Libro.create({
    titulo: `Servicio inventario ${suffix} ${Date.now()}`,
    isbn: `I${Date.now().toString().slice(-12)}${suffix}`.slice(0, 20),
    resena: 'Fixture aislado para transacciones del servicio',
    precio: 0,
  });
  records.books.push(book);
  const inventory = await Inventario.create({
    libro_id: book.id,
    bodega_id: bodega.id,
    stock_actual: 0,
    stock_minimo: 1,
  });
  records.inventories.push(inventory);

  if (initialStock > 0) {
    const movement = await sequelize.transaction((transaction) =>
      movimientoRepository.createMovimiento({ transaction }, {
        inventarioId: inventory.id,
        usuarioId: usuario.id,
        tipoMovimientoId: ingresoType.id,
        cantidad: initialStock,
        motivoDetalle: `Fixture inicial ${suffix}`,
      })
    );
    records.movements.push(await MovimientoInventario.findByPk(movement.id));
  }
  return inventory;
}

let ingresoType;

before(async () => {
  const seed = require('../src/database/seed');
  const { bodegaId } = await seed();
  bodega = await Bodega.findByPk(bodegaId);
  usuario = await Usuario.findOne();
  assert.ok(usuario);
  ingresoType = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  assert.ok(ingresoType);
  salidaInventory = await makeInventory('salida', 3);
  concurrencyInventory = await makeInventory('concurrente', 1);
});

after(async () => {
  try {
    for (const movement of records.movements) {
      if (movement) await movement.destroy();
    }
    for (const inventory of records.inventories) await inventory.destroy();
    for (const book of records.books) await book.destroy();
  } finally {
    await Promise.allSettled([sequelize.close(), db.pool.end()]);
  }
});

function mockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
  };
}

test('registrarSalida descuenta mediante trigger y conserva formato HTTP de éxito', async () => {
  const response = mockResponse();
  let nextError;
  await inventarioController.salida({
    params: { id: salidaInventory.id },
    body: { cantidad: 1, motivo: 'Salida de prueba' },
    user: { id: usuario.id },
  }, response, (error) => { nextError = error; });

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.status, 'success');
  assert.equal(response.body.data.inventario.id, salidaInventory.id);
  assert.equal(response.body.data.inventario.stock_actual, 2);
  assert.equal(response.body.data.movimiento.tipo, 'Salida');
  assert.equal(response.body.data.movimiento.motivo, 'Salida de prueba');
  records.movements.push(await MovimientoInventario.findByPk(response.body.data.movimiento.id));
});

test('registrarSalida rechaza stock insuficiente sin persistir movimiento', async () => {
  const beforeCount = await MovimientoInventario.count({ where: { inventario_id: salidaInventory.id } });
  await assert.rejects(
    inventarioService.registrarSalida({ inventarioId: salidaInventory.id, cantidad: 3, usuarioId: usuario.id }),
    (error) => error instanceof ConflictError && error.statusCode === 409
  );
  assert.equal(await MovimientoInventario.count({ where: { inventario_id: salidaInventory.id } }), beforeCount);
  assert.equal((await inventarioRepository.findById(salidaInventory.id)).stock_actual, 2);
});

test('registrarSalida rechaza cantidades inválidas', async () => {
  for (const cantidad of [0, -1, 1.2, 'no-numérico', null]) {
    await assert.rejects(
      inventarioService.registrarSalida({ inventarioId: salidaInventory.id, cantidad, usuarioId: usuario.id }),
      (error) => error instanceof ValidationError && error.statusCode === 400
    );
  }
});

test('registrarAjuste fija stock con trigger y conserva el motivo de auditoría', async () => {
  const result = await inventarioService.registrarAjuste({
    inventarioId: salidaInventory.id,
    stockNuevo: 5,
    motivo: 'Conteo físico de cierre',
    usuarioId: usuario.id,
  });
  assert.equal(result.stock_anterior, 2);
  assert.equal(result.inventario.stock_actual, 5);
  assert.equal(result.movimiento.tipo, 'Ajuste');
  assert.match(result.movimiento.motivo, /Conteo físico de cierre/);
  assert.match(result.movimiento.motivo, /Stock anterior: 2\. Stock nuevo: 5\./);
  const persisted = await MovimientoInventario.findByPk(result.movimiento.id);
  records.movements.push(persisted);
  assert.equal(persisted.motivo_detalle, result.movimiento.motivo);
  assert.equal((await inventarioRepository.findById(salidaInventory.id)).stock_actual, 5);
});

test('registrarAjuste rechaza valores inválidos, motivo vacío y stock sin cambio', async () => {
  for (const stockNuevo of [-1, 1.5, 'invalido', null]) {
    await assert.rejects(
      inventarioService.registrarAjuste({ inventarioId: salidaInventory.id, stockNuevo, motivo: 'conteo', usuarioId: usuario.id }),
      (error) => error instanceof ValidationError && error.statusCode === 400
    );
  }
  await assert.rejects(
    inventarioService.registrarAjuste({ inventarioId: salidaInventory.id, stockNuevo: 5, motivo: 'conteo', usuarioId: usuario.id }),
    (error) => error instanceof ValidationError && error.statusCode === 400
  );
  await assert.rejects(
    inventarioService.registrarAjuste({ inventarioId: salidaInventory.id, stockNuevo: 4, motivo: '  ', usuarioId: usuario.id }),
    (error) => error instanceof ValidationError && error.statusCode === 400
  );
});

test('registrarSalida revierte movimiento y trigger si ocurre un error después de insertar', async () => {
  const beforeStock = (await inventarioRepository.findById(salidaInventory.id)).stock_actual;
  const beforeCount = await MovimientoInventario.count({ where: { inventario_id: salidaInventory.id } });
  const originalFindById = inventarioRepository.findById;
  inventarioRepository.findById = async (id, options) => {
    if (id === salidaInventory.id) throw new Error('ERROR_POST_MOVIMIENTO');
    return originalFindById.call(inventarioRepository, id, options);
  };
  try {
    await assert.rejects(
      inventarioService.registrarSalida({ inventarioId: salidaInventory.id, cantidad: 1, usuarioId: usuario.id }),
      /ERROR_POST_MOVIMIENTO/
    );
  } finally {
    inventarioRepository.findById = originalFindById;
  }
  assert.equal((await inventarioRepository.findById(salidaInventory.id)).stock_actual, beforeStock);
  assert.equal(await MovimientoInventario.count({ where: { inventario_id: salidaInventory.id } }), beforeCount);
});

test('dos salidas concurrentes de la última unidad confirman solo una y nunca dejan stock negativo', async () => {
  const outcomes = await Promise.allSettled([
    inventarioService.registrarSalida({ inventarioId: concurrencyInventory.id, cantidad: 1, usuarioId: usuario.id }),
    inventarioService.registrarSalida({ inventarioId: concurrencyInventory.id, cantidad: 1, usuarioId: usuario.id }),
  ]);
  const fulfilled = outcomes.filter((item) => item.status === 'fulfilled');
  const rejected = outcomes.filter((item) => item.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof ConflictError);
  records.movements.push(await MovimientoInventario.findByPk(fulfilled[0].value.movimiento.id));
  const inventory = await inventarioRepository.findById(concurrencyInventory.id);
  assert.equal(inventory.stock_actual, 0);
  assert.ok(inventory.stock_actual >= 0);
  assert.equal(await MovimientoInventario.count({ where: { inventario_id: concurrencyInventory.id } }), 2);
});

test('controller conserva el error HTTP 409 ante salida con stock insuficiente', async () => {
  const response = mockResponse();
  let nextError;
  await inventarioController.salida({
    params: { id: concurrencyInventory.id },
    body: { cantidad: 1 },
    user: { id: usuario.id },
  }, response, (error) => { nextError = error; });
  assert.equal(response.statusCode, null);
  assert.ok(nextError instanceof ConflictError);
  assert.equal(nextError.statusCode, 409);
});

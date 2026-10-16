const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  sequelize, Libro, Inventario, Bodega, Usuario, Categoria, Autor, Editorial,
  TipoMovimiento, MovimientoInventario,
} = require('../src/models');
const db = require('../src/config/db');
const libroService = require('../src/services/libro.service');
const googleBooksService = require('../src/services/googleBooks.service');
const libroRepository = require('../src/repositories/libro.repository');
const inventarioRepository = require('../src/repositories/inventario.repository');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const libroController = require('../src/controllers/libro.controller');
const { ConflictError } = require('../src/utils/errors');

const runId = `${Date.now()}${process.pid}`;
const isbnList = new Set();
const inventoryIds = new Set();
const authorNames = new Set();
const editorialNames = new Set();
const movementIds = new Set();
let bodega;
let usuario;
let categoria;
let ingresoType;
const originalBuscarPorIsbn = googleBooksService.buscarPorIsbn;

let isbnSequence = 0;
function newIsbn() {
  const serial = `${runId}${isbnSequence++}`;
  const firstTwelve = `978${serial.slice(-9)}`;
  const sum = [...firstTwelve].reduce((total, digit, index) =>
    total + Number(digit) * (index % 2 ? 3 : 1), 0);
  const isbn = `${firstTwelve}${(10 - (sum % 10)) % 10}`;
  isbnList.add(isbn);
  return isbn;
}

function bibliographicData(isbn) {
  const suffix = `${runId}-${isbn.slice(-4)}`;
  const autor = `Autor scan ${suffix}`;
  const editorial = `Editorial scan ${suffix}`;
  authorNames.add(autor);
  editorialNames.add(editorial);
  return {
    isbn,
    titulo: `Libro escaneado ${suffix}`,
    autor,
    editorial,
    resena: `Reseña de prueba ${suffix}`,
    imagen_url: null,
    precio: 17.5,
    fuente: 'Fixture tests',
  };
}

async function createBook({ isbn = newIsbn(), title = `Libro fixture ${runId}`, autor_id = null, editorial_id = null } = {}) {
  const book = await Libro.create({
    titulo: title,
    isbn,
    autor_id,
    editorial_id,
    resena: 'Libro fixture para pruebas transaccionales',
    precio: 10,
  });
  isbnList.add(isbn);
  return book;
}

async function createInventory(book) {
  const inventory = await Inventario.create({
    libro_id: book.id,
    bodega_id: bodega.id,
    stock_actual: 0,
    stock_minimo: 1,
  });
  inventoryIds.add(inventory.id);
  return inventory;
}

async function addStockByMovement(inventory, quantity) {
  const movement = await sequelize.transaction((transaction) =>
    movimientoRepository.createMovimiento({ transaction }, {
      inventarioId: inventory.id,
      usuarioId: usuario.id,
      tipoMovimientoId: ingresoType.id,
      cantidad: quantity,
      motivoDetalle: 'Stock fixture agregado mediante trigger',
    })
  );
  movementIds.add(movement.id);
  return movement;
}

function responseMock() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
  };
}

function trackResult(result) {
  if (result?.libro?.isbn) isbnList.add(result.libro.isbn);
  if (result?.inventario?.id) inventoryIds.add(result.inventario.id);
  if (result?.movimiento?.id) movementIds.add(result.movimiento.id);
}

before(async () => {
  const seed = require('../src/database/seed');
  const { bodegaId } = await seed();
  bodega = await Bodega.findByPk(bodegaId);
  usuario = await Usuario.findOne();
  categoria = await Categoria.findOne();
  assert.ok(usuario && categoria);
  ingresoType = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  assert.ok(ingresoType);
  googleBooksService.buscarPorIsbn = async (isbn) => bibliographicData(isbn);
});

after(async () => {
  googleBooksService.buscarPorIsbn = originalBuscarPorIsbn;
  try {
    if (movementIds.size) await MovimientoInventario.destroy({ where: { id: [...movementIds] } });
    if (inventoryIds.size) await Inventario.destroy({ where: { id: [...inventoryIds] } });
    if (isbnList.size) await Libro.destroy({ where: { isbn: [...isbnList] } });
    if (authorNames.size) await Autor.destroy({ where: { nombre: [...authorNames] } });
    if (editorialNames.size) await Editorial.destroy({ where: { nombre: [...editorialNames] } });
  } finally {
    await Promise.allSettled([sequelize.close(), db.pool.end()]);
  }
});

test('escanearLibro: reutiliza ISBN existente y crea inventario/movimiento sin consultar API externa', async () => {
  const isbn = newIsbn();
  const book = await createBook({ isbn });
  let externalCalls = 0;
  const originalLookup = googleBooksService.buscarPorIsbn;
  googleBooksService.buscarPorIsbn = async () => { externalCalls += 1; return null; };
  try {
    const result = await libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id });
    trackResult(result);
    assert.equal(result.es_nuevo_en_catalogo, false);
    assert.equal(result.libro.id, book.id);
    assert.equal(result.inventario.stock_anterior, 0);
    assert.equal(result.inventario.stock_actual, 1);
    assert.equal(externalCalls, 0);
  } finally {
    googleBooksService.buscarPorIsbn = originalLookup;
  }
});

test('escanearLibro: consulta datos externos antes de abrir la transacción y el trigger suma una vez', async () => {
  const isbn = newIsbn();
  let transactionStarted = false;
  const originalTransaction = sequelize.transaction;
  const originalLookup = googleBooksService.buscarPorIsbn;
  sequelize.transaction = function (...args) {
    transactionStarted = true;
    return originalTransaction.apply(this, args);
  };
  googleBooksService.buscarPorIsbn = async (requestedIsbn) => {
    assert.equal(transactionStarted, false, 'La consulta externa debe ocurrir antes de abrir la transacción');
    return bibliographicData(requestedIsbn);
  };
  try {
    const result = await libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id });
    trackResult(result);
    assert.equal(result.es_nuevo_en_catalogo, true);
    assert.equal(result.inventario.stock_actual, 1);
    assert.equal(result.movimiento.cantidad, 1);
    assert.equal(await Libro.count({ where: { isbn } }), 1);
    assert.equal(await MovimientoInventario.count({ where: { inventario_id: result.inventario.id } }), 1);
  } finally {
    sequelize.transaction = originalTransaction;
    googleBooksService.buscarPorIsbn = originalLookup;
  }
});

test('errores después de crear autor revierten el autor dentro de la transacción', async () => {
  const isbn = newIsbn();
  const data = bibliographicData(isbn);
  const original = libroService._upsertEditorial;
  libroService._upsertEditorial = async () => { throw new Error('FALLO_DESPUES_AUTOR'); };
  try {
    await assert.rejects(
      libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
      /FALLO_DESPUES_AUTOR/
    );
  } finally {
    libroService._upsertEditorial = original;
  }
  assert.equal(await Autor.count({ where: { nombre: data.autor } }), 0);
  assert.equal(await Libro.count({ where: { isbn } }), 0);
});

test('errores después de crear editorial revierten autor y editorial', async () => {
  const isbn = newIsbn();
  const data = bibliographicData(isbn);
  const original = libroRepository.upsert;
  libroRepository.upsert = async () => { throw new Error('FALLO_DESPUES_EDITORIAL'); };
  try {
    await assert.rejects(
      libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
      /FALLO_DESPUES_EDITORIAL/
    );
  } finally {
    libroRepository.upsert = original;
  }
  assert.equal(await Autor.count({ where: { nombre: data.autor } }), 0);
  assert.equal(await Editorial.count({ where: { nombre: data.editorial } }), 0);
  assert.equal(await Libro.count({ where: { isbn } }), 0);
});

test('errores después de crear libro revierten libro, autor y editorial', async () => {
  const isbn = newIsbn();
  const data = bibliographicData(isbn);
  const original = inventarioRepository.findOrCreate;
  inventarioRepository.findOrCreate = async () => { throw new Error('FALLO_DESPUES_LIBRO'); };
  try {
    await assert.rejects(
      libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
      /FALLO_DESPUES_LIBRO/
    );
  } finally {
    inventarioRepository.findOrCreate = original;
  }
  assert.equal(await Libro.count({ where: { isbn } }), 0);
  assert.equal(await Autor.count({ where: { nombre: data.autor } }), 0);
  assert.equal(await Editorial.count({ where: { nombre: data.editorial } }), 0);
});

test('error después del movimiento revierte el movimiento y el stock del trigger', async () => {
  const book = await createBook();
  const inventory = await createInventory(book);
  await addStockByMovement(inventory, 4);
  const beforeMovements = await MovimientoInventario.count({ where: { inventario_id: inventory.id } });
  const original = inventarioRepository.findById;
  inventarioRepository.findById = async (id, options) => {
    if (id === inventory.id) throw new Error('FALLO_DESPUES_MOVIMIENTO');
    return original.call(inventarioRepository, id, options);
  };
  try {
    await assert.rejects(
      libroService.escanearLibro({ isbn: book.isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
      /FALLO_DESPUES_MOVIMIENTO/
    );
  } finally {
    inventarioRepository.findById = original;
  }
  assert.equal((await inventarioRepository.findById(inventory.id)).stock_actual, 4);
  assert.equal(await MovimientoInventario.count({ where: { inventario_id: inventory.id } }), beforeMovements);
});

test('dos escaneos concurrentes del mismo ISBN no duplican libro/inventario y acumulan ambos movimientos', async () => {
  const isbn = newIsbn();
  const results = await Promise.all([
    libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
    libroService.escanearLibro({ isbn, bodegaId: bodega.id, usuarioId: usuario.id }),
  ]);
  results.forEach(trackResult);
  const book = await Libro.findOne({ where: { isbn } });
  assert.ok(book);
  assert.equal(await Libro.count({ where: { isbn } }), 1);
  const inventory = await Inventario.findOne({ where: { libro_id: book.id, bodega_id: bodega.id } });
  assert.ok(inventory);
  inventoryIds.add(inventory.id);
  assert.equal(inventory.stock_actual, 2);
  assert.equal(await Inventario.count({ where: { libro_id: book.id, bodega_id: bodega.id } }), 1);
  const movements = await MovimientoInventario.findAll({ where: { inventario_id: inventory.id } });
  assert.equal(movements.length, 2);
  movements.forEach((movement) => movementIds.add(movement.id));
});

test('registrarLibro mantiene precios por rol y responde con estructura original', async () => {
  const adminIsbn = newIsbn();
  const adminPayload = {
    isbn: adminIsbn, titulo: `Registro admin ${runId}`, autor: `Autor manual ${runId}`,
    editorial: `Editorial manual ${runId}`, categoriaId: categoria.id,
    resena: 'Registro administrativo', precio: 42.5, cantidad: 2, bodegaId: bodega.id,
    usuarioId: usuario.id, usuarioRol: 'Administrador',
  };
  authorNames.add(adminPayload.autor);
  editorialNames.add(adminPayload.editorial);
  const adminResult = await libroService.registrarLibro(adminPayload);
  trackResult(adminResult);
  assert.equal(adminResult.libro.precio, 42.5);
  assert.equal(adminResult.precio_pendiente, false);
  assert.equal(adminResult.inventario.stock_actual, 2);

  const employeeIsbn = newIsbn();
  const employeePayload = {
    ...adminPayload,
    isbn: employeeIsbn,
    titulo: `Registro empleado ${runId}`,
    autor: `Autor empleado ${runId}`,
    editorial: `Editorial empleado ${runId}`,
    precio: 99,
    usuarioRol: 'Empleado',
  };
  authorNames.add(employeePayload.autor);
  editorialNames.add(employeePayload.editorial);
  const response = responseMock();
  let nextError;
  await libroController.registrar({
    body: employeePayload,
    user: { id: usuario.id, rol: 'Empleado' },
  }, response, (error) => { nextError = error; });
  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.status, 'success');
  assert.equal(response.body.data.libro.precio, 0);
  assert.equal(response.body.data.precio_pendiente, true);
  trackResult(response.body.data);
});

test('ingresoLibro crea inventario concurrentemente una sola vez y trigger acumula ingresos', async () => {
  const book = await createBook();
  const results = await Promise.all([
    libroService.ingresoLibro({ libroId: book.id, bodegaId: bodega.id, cantidad: 2, usuarioId: usuario.id }),
    libroService.ingresoLibro({ libroId: book.id, bodegaId: bodega.id, cantidad: 3, usuarioId: usuario.id }),
  ]);
  results.forEach(trackResult);
  const inventory = await Inventario.findOne({ where: { libro_id: book.id, bodega_id: bodega.id } });
  assert.ok(inventory);
  inventoryIds.add(inventory.id);
  assert.equal(await Inventario.count({ where: { libro_id: book.id, bodega_id: bodega.id } }), 1);
  assert.equal(inventory.stock_actual, 5);
  const movements = await MovimientoInventario.findAll({ where: { inventario_id: inventory.id } });
  assert.deepEqual(movements.map((movement) => movement.cantidad).sort(), [2, 3]);
  movements.forEach((movement) => movementIds.add(movement.id));
});

test('dos registros manuales concurrentes del mismo ISBN preservan UNIQUE y contrato de conflicto', async () => {
  const isbn = newIsbn();
  const payload = {
    isbn, titulo: `Registro concurrente ${runId}`, autor: `Autor concurrente ${runId}`,
    editorial: `Editorial concurrente ${runId}`, categoriaId: categoria.id,
    resena: 'Registro simultáneo', precio: 8, cantidad: 1, bodegaId: bodega.id,
    usuarioId: usuario.id, usuarioRol: 'Administrador',
  };
  authorNames.add(payload.autor);
  editorialNames.add(payload.editorial);
  const outcomes = await Promise.allSettled([
    libroService.registrarLibro(payload),
    libroService.registrarLibro(payload),
  ]);
  const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
  const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
  fulfilled.forEach((outcome) => trackResult(outcome.value));
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof ConflictError);
  assert.equal(await Libro.count({ where: { isbn } }), 1);
});

test('escanearLibro mantiene respuesta HTTP 201 para libro nuevo y 200 para existente', async () => {
  const isbn = newIsbn();
  const controllerCall = async () => {
    const response = responseMock();
    let nextError;
    await libroController.escanear({
      body: { isbn, bodegaId: bodega.id, usuarioId: usuario.id },
    }, response, (error) => { nextError = error; });
    assert.equal(nextError, undefined);
    trackResult(response.body.data);
    return response;
  };
  const created = await controllerCall();
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.status, 'success');
  const reused = await controllerCall();
  assert.equal(reused.statusCode, 200);
  assert.equal(reused.body.status, 'success');
});

test('ingresoLibro rechaza cantidades fuera del contrato del endpoint', async () => {
  const book = await createBook();
  for (const cantidad of [undefined, null, '', 0, -1, 1.5, 'no-numérico']) {
    await assert.rejects(
      libroService.ingresoLibro({ libroId: book.id, bodegaId: bodega.id, cantidad, usuarioId: usuario.id }),
      (error) => error.statusCode === 400
    );
  }
});

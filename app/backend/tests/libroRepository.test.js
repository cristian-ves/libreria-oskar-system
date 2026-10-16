const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const libroRepository = require('../src/repositories/libro.repository');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const {
  sequelize, Libro, Autor, Editorial, Categoria, Inventario, Bodega, Sucursal,
  Usuario, TipoMovimiento, MovimientoInventario,
} = require('../src/models');

const unique = Date.now().toString();
const records = { books: [], authors: [], publishers: [], categories: [], inventories: [], branches: [], warehouses: [], movements: [] };
let primaryBranch;
let primaryWarehouse;
let secondBranch;
let secondWarehouse;
let user;
let ingresoType;
let related;

async function makeBook(suffix, overrides = {}) {
  const book = await Libro.create({
    titulo: `Libro ORM ${suffix}`,
    isbn: `T${unique.slice(-10)}${suffix}`.slice(0, 20),
    resena: `Reseña ${suffix}`,
    precio: 20,
    ...overrides,
  });
  records.books.push(book);
  return book;
}

before(async () => {
  const seed = require('../src/database/seed');
  const { bodegaId } = await seed();
  primaryWarehouse = await Bodega.findByPk(bodegaId);
  primaryBranch = await Sucursal.findByPk(primaryWarehouse.sucursal_id);
  secondBranch = await Sucursal.create({
    nombre: `Sucursal Libro ${unique}`,
    direccion: 'Dirección de pruebas',
    telefono: null,
  });
  records.branches.push(secondBranch);
  secondWarehouse = await Bodega.create({
    sucursal_id: secondBranch.id,
    nombre: `Bodega Libro ${unique}`,
    descripcion: 'Fixture de disponibilidad',
  });
  records.warehouses.push(secondWarehouse);
  user = await Usuario.findOne();
  assert.ok(user, 'El seed debe proporcionar un usuario de prueba');
  ingresoType = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  assert.ok(ingresoType, 'El seed debe proporcionar el tipo Ingreso');

  const autor = await Autor.create({ nombre: `Autor ORM ${unique}`, biografia: 'Bio' });
  const editorial = await Editorial.create({ nombre: `Editorial ORM ${unique}`, pais: 'GT' });
  const categoria = await Categoria.create({ nombre: `Categoría ORM ${unique}` });
  records.authors.push(autor);
  records.publishers.push(editorial);
  records.categories.push(categoria);
  related = { autor, editorial, categoria };
});

after(async () => {
  try {
    for (const movement of records.movements) await movement.destroy();
    for (const inventory of records.inventories) await inventory.destroy();
    for (const book of records.books) await book.destroy();
    for (const warehouse of records.warehouses) await warehouse.destroy();
    for (const branch of records.branches) await branch.destroy();
    for (const item of records.categories) await item.destroy();
    for (const item of records.publishers) await item.destroy();
    for (const item of records.authors) await item.destroy();
  } finally {
    await Promise.allSettled([sequelize.close(), db.pool.end()]);
  }
});

test('LibroRepository: consultas por ISBN y UUID conservan relaciones, alias y ausencia', async () => {
  const book = await makeBook('lookup', {
    autor_id: related.autor.id,
    editorial_id: related.editorial.id,
    categoria_id: related.categoria.id,
  });
  const byIsbn = await libroRepository.findByIsbn(`  ${book.isbn}  `);
  assert.equal(byIsbn.id, book.id);
  assert.equal(byIsbn.autor_nombre, related.autor.nombre);
  assert.equal(byIsbn.editorial_nombre, related.editorial.nombre);
  assert.equal(byIsbn.categoria_nombre, related.categoria.nombre);
  assert.equal(Object.hasOwn(byIsbn, 'autor'), false);

  const byId = await libroRepository.findById(book.id);
  assert.equal(byId.id, book.id);
  assert.equal(byId.autor_nombre, related.autor.nombre);
  assert.equal(await libroRepository.findByIsbn('NO-EXISTE-ISBN'), null);
  assert.equal(await libroRepository.findById('00000000-0000-0000-0000-000000000000'), null);
});

test('LibroRepository.create: escribe con ORM, limpia valores y soporta rollback Sequelize', async () => {
  const plain = await libroRepository.create({}, {
    titulo: '  Alta manual ORM  ', isbn: null, resena: '  reseña  ', precio: '12.50',
  });
  assert.equal(plain.titulo, 'Alta manual ORM');
  assert.equal(plain.resena, 'reseña');
  assert.equal(plain.precio, '12.50');
  assert.equal(plain.isbn, null);

  let rolledBackId;
  await assert.rejects(sequelize.transaction(async (transaction) => {
    const created = await libroRepository.create({ transaction }, {
      titulo: 'Alta para rollback', isbn: null, resena: 'temporal', precio: 0,
    });
    rolledBackId = created.id;
    throw new Error('ROLLBACK_LIBRO_TEST');
  }), /ROLLBACK_LIBRO_TEST/);
  assert.equal(await Libro.findByPk(rolledBackId), null);
});

test('LibroRepository.upsert: UNIQUE ISBN, metadatos no nulos, precio y activo sin cambios al conflicto', async () => {
  const book = await makeBook('upsert', {
    autor_id: related.autor.id,
    editorial_id: related.editorial.id,
    categoria_id: related.categoria.id,
    imagen_url: 'https://example.test/cover.jpg',
    activo: false,
  });
  const updated = await libroRepository.upsert({}, {
    titulo: 'Título actualizado', isbn: book.isbn, resena: 'Reseña actualizada',
    precio: 99, activo: true,
  });
  assert.equal(updated.id, book.id);
  assert.equal(updated.titulo, 'Título actualizado');
  assert.equal(updated.autor_id, related.autor.id);
  assert.equal(updated.editorial_id, related.editorial.id);
  assert.equal(updated.categoria_id, related.categoria.id);
  assert.equal(updated.imagen_url, 'https://example.test/cover.jpg');
  assert.equal(Number(updated.precio), 20);
  assert.equal(updated.activo, false);
  assert.equal(await Libro.count({ where: { isbn: book.isbn } }), 1);
});

test('LibroRepository.upsert: operaciones concurrentes del mismo ISBN devuelven un único libro', async () => {
  const isbn = `C${unique.slice(-12)}`;
  const results = await Promise.all([
    libroRepository.upsert({}, { titulo: 'Concurrencia A', isbn, resena: 'A', precio: 1 }),
    libroRepository.upsert({}, { titulo: 'Concurrencia B', isbn, resena: 'B', precio: 2 }),
  ]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(await Libro.count({ where: { isbn } }), 1);
  const found = await Libro.findByPk(results[0].id);
  assert.ok(['Concurrencia A', 'Concurrencia B'].includes(found.titulo));
});

test('LibroRepository.searchAndList: filtros, asociaciones, límite, JSON y stock agregado entre bodegas', async () => {
  const book = await makeBook('search', {
    autor_id: related.autor.id,
    editorial_id: related.editorial.id,
    categoria_id: related.categoria.id,
  });
  const invA = await Inventario.create({ libro_id: book.id, bodega_id: primaryWarehouse.id, stock_actual: 0, stock_minimo: 1 });
  const invB = await Inventario.create({ libro_id: book.id, bodega_id: secondWarehouse.id, stock_actual: 0, stock_minimo: 1 });
  records.inventories.push(invA, invB);
  for (const inventory of [invA, invB]) {
    const movement = await movimientoRepository.createMovimiento({}, {
      inventarioId: inventory.id, usuarioId: user.id, tipoMovimientoId: ingresoType.id,
      cantidad: 2, motivoDetalle: 'Fixture de stock para catálogo',
    });
    records.movements.push(await MovimientoInventario.findByPk(movement.id));
  }

  const rows = await libroRepository.searchAndList('Libro ORM search', related.categoria.id);
  const result = rows.find((row) => row.id === book.id);
  assert.ok(result);
  assert.equal(result.autor_nombre, related.autor.nombre);
  assert.equal(result.editorial_nombre, related.editorial.nombre);
  assert.equal(result.categoria_nombre, related.categoria.nombre);
  assert.equal(Number(result.stock_total), 4);
  assert.equal(rows.filter((row) => row.id === book.id).length, 1);
  assert.ok(rows.length <= 50);
  assert.equal((await libroRepository.searchAndList('término inexistente')).length, 0);
});

test('LibroRepository.findDetalleByRef: UUID y shortId exponen disponibilidad por sucursal/bodega', async () => {
  const book = await makeBook('detail', {
    autor_id: related.autor.id,
    editorial_id: related.editorial.id,
    categoria_id: related.categoria.id,
  });
  const invA = await Inventario.create({ libro_id: book.id, bodega_id: primaryWarehouse.id, stock_actual: 0, stock_minimo: 1 });
  const invB = await Inventario.create({ libro_id: book.id, bodega_id: secondWarehouse.id, stock_actual: 0, stock_minimo: 1 });
  records.inventories.push(invA, invB);
  for (const inventory of [invA, invB]) {
    const movement = await movimientoRepository.createMovimiento({}, {
      inventarioId: inventory.id, usuarioId: user.id, tipoMovimientoId: ingresoType.id,
      cantidad: 1, motivoDetalle: 'Fixture de disponibilidad por ubicación',
    });
    records.movements.push(await MovimientoInventario.findByPk(movement.id));
  }

  const uuidResult = await libroRepository.findDetalleByRef({ id: book.id });
  const shortId = book.id.replace(/-/g, '').slice(0, 12);
  const shortResult = await libroRepository.findDetalleByRef({ shortId });
  for (const result of [uuidResult, shortResult]) {
    assert.equal(result.id, book.id);
    assert.equal(result.autor_nombre, related.autor.nombre);
    assert.equal(result.editorial_nombre, related.editorial.nombre);
    assert.equal(result.categoria_nombre, related.categoria.nombre);
    assert.equal(result.stock_total, 2);
    assert.equal(result.disponibilidad.length, 2);
    assert.ok(result.disponibilidad.some((item) => item.bodega_nombre === primaryWarehouse.nombre));
    assert.ok(result.disponibilidad.some((item) => item.sucursal_nombre === secondBranch.nombre));
    assert.ok('sucursal_direccion' in result.disponibilidad[0]);
    assert.deepEqual(
      result.disponibilidad.map((item) => item.sucursal_nombre),
      [...result.disponibilidad.map((item) => item.sucursal_nombre)].sort((a, b) => a.localeCompare(b))
    );
  }
  assert.equal(await libroRepository.findDetalleByRef({ id: '00000000-0000-0000-0000-000000000000' }), null);
  assert.equal(await libroRepository.findDetalleByRef(null), null);
});

test('LibroRepository.upsert: comparte transacción Sequelize y revierte alta al fallar', async () => {
  const isbn = `T${unique.slice(-12)}RB`;
  let createdId;
  await assert.rejects(sequelize.transaction(async (transaction) => {
    const created = await libroRepository.upsert({ transaction }, {
      titulo: 'Upsert ORM para rollback', isbn, resena: 'temporal', precio: 4,
    });
    createdId = created.id;
    const visibleInsideTransaction = await libroRepository.findByIsbn(isbn, { transaction });
    assert.equal(visibleInsideTransaction.id, createdId);
    throw new Error('ROLLBACK_SEQUELIZE_LIBRO_TEST');
  }), /ROLLBACK_SEQUELIZE_LIBRO_TEST/);

  assert.equal(await Libro.findByPk(createdId), null);
  assert.equal(await libroRepository.findByIsbn(isbn), null);
});

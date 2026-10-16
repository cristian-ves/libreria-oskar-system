const { after, before, test } = require('node:test');
const assert = require('node:assert');
const { sequelize } = require('../src/config/sequelize');
const db = require('../src/config/db');
const inventarioRepository = require('../src/repositories/inventario.repository');
const {
  Inventario,
  Libro,
  Bodega,
  Sucursal,
  Usuario,
  TipoMovimiento,
  MovimientoInventario,
} = require('../src/models');

let baselineBook;
let baselineInventory;

before(async () => {
  const seed = require('../src/database/seed');
  const { bodegaId } = await seed();
  baselineBook = await Libro.create({
    titulo: `Libro Base Inventario ${Date.now()}`,
    isbn: `B${Date.now()}`,
    resena: 'Fixture base para pruebas aisladas de inventario',
    precio: 10,
  });
  baselineInventory = await Inventario.create({
    libro_id: baselineBook.id,
    bodega_id: bodegaId,
    stock_actual: 0,
    stock_minimo: 5,
  });
});

after(async () => {
  try {
    if (baselineInventory) await baselineInventory.destroy();
    if (baselineBook) await baselineBook.destroy();
  } finally {
    await Promise.allSettled([sequelize.close(), db.pool.end()]);
  }
});

test('InventarioRepository - A. findByLibroAndBodega() busca registro existente y null si no existe', async () => {
  const invExistente = await Inventario.findOne();
  assert.ok(invExistente, 'Debe haber al menos un inventario registrado');

  const encontrado = await inventarioRepository.findByLibroAndBodega(
    invExistente.libro_id,
    invExistente.bodega_id
  );

  assert.ok(encontrado, 'Debe encontrar el inventario');
  assert.strictEqual(encontrado.id, invExistente.id);
  assert.strictEqual(encontrado.libro_id, invExistente.libro_id);
  assert.strictEqual(encontrado.bodega_id, invExistente.bodega_id);
  assert.ok(typeof encontrado.stock_actual === 'number');
  assert.ok(typeof encontrado.stock_minimo === 'number');

  const noExiste = await inventarioRepository.findByLibroAndBodega(
    '00000000-0000-0000-0000-000000000000',
    invExistente.bodega_id
  );
  assert.strictEqual(noExiste, null, 'Debe retornar null para libro inexistente');
});

test('InventarioRepository - B. findOrCreate() crea nuevo registro con stock_actual = 0', async () => {
  const bodega = await Bodega.findOne();
  assert.ok(bodega, 'Debe existir una bodega');

  // Crear libro temporal
  const libroTemp = await Libro.create({
    titulo: `Libro Test FindOrCreate ${Date.now()}`,
    isbn: `T${Date.now()}`,
    resena: 'Reseña de prueba',
    precio: 25.50,
  });

  try {
    const inv = await inventarioRepository.findOrCreate(
      libroTemp.id,
      bodega.id,
      8
    );

    assert.ok(inv, 'Debe crear y retornar el inventario');
    assert.strictEqual(inv.libro_id, libroTemp.id);
    assert.strictEqual(inv.bodega_id, bodega.id);
    assert.strictEqual(inv.stock_actual, 0, 'stock_actual inicial debe ser exactamente 0');
    assert.strictEqual(inv.stock_minimo, 8);
  } finally {
    await Inventario.destroy({ where: { libro_id: libroTemp.id } });
    await libroTemp.destroy();
  }
});

test('InventarioRepository - C. findOrCreate() sobre registro existente no duplica ni altera stock', async () => {
  const invExistente = await Inventario.findOne();
  assert.ok(invExistente);
  const stockPrevio = invExistente.stock_actual;

  const resultado = await inventarioRepository.findOrCreate(
    invExistente.libro_id,
    invExistente.bodega_id,
    10
  );

  assert.strictEqual(resultado.id, invExistente.id, 'Debe devolver el mismo ID existente');
  assert.strictEqual(resultado.stock_actual, stockPrevio, 'No debe reiniciar ni alterar el stock_actual existente');
});

test('InventarioRepository - D. findByLibroId() retorna bodegas y nombres de sucursales ordenados', async () => {
  const invExistente = await Inventario.findOne();
  assert.ok(invExistente);

  const lista = await inventarioRepository.findByLibroId(invExistente.libro_id);
  assert.ok(Array.isArray(lista));
  assert.ok(lista.length > 0);

  const primerItem = lista[0];
  assert.ok(primerItem.id);
  assert.ok(primerItem.bodega_id);
  assert.ok('bodega_nombre' in primerItem, 'Debe incluir bodega_nombre');
  assert.ok('sucursal_nombre' in primerItem, 'Debe incluir sucursal_nombre');
  assert.ok(typeof primerItem.stock_actual === 'number');
  assert.ok(typeof primerItem.stock_minimo === 'number');
});

test('InventarioRepository - E. setStockMinimo() modifica umbral y mantiene intacto stock_actual', async () => {
  const t = await sequelize.transaction();
  try {
    const inv = await Inventario.findOne({ transaction: t });
    assert.ok(inv);
    const stockActualAntes = inv.stock_actual;
    const nuevoStockMinimo = 17;

    const actualizado = await inventarioRepository.setStockMinimo(
      inv.id,
      nuevoStockMinimo,
      { transaction: t }
    );

    assert.ok(actualizado);
    assert.strictEqual(actualizado.stock_minimo, nuevoStockMinimo);
    assert.strictEqual(
      actualizado.stock_actual,
      stockActualAntes,
      'stock_actual debe permanecer intacto tras actualizar stock_minimo'
    );

    // Verificar en BD
    const enDb = await Inventario.findByPk(inv.id, { transaction: t });
    assert.strictEqual(enDb.stock_minimo, nuevoStockMinimo);
    assert.strictEqual(enDb.stock_actual, stockActualAntes);

    await t.rollback();
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

test('InventarioRepository - F. findByIdForUpdate() aplica bloqueo pesimista en transacción y falla sin ella', async () => {
  const inv = await Inventario.findOne();
  assert.ok(inv);

  // 1. Debe fallar si se llama sin transacción
  await assert.rejects(
    async () => {
      await inventarioRepository.findByIdForUpdate(inv.id, {});
    },
    /findByIdForUpdate requiere una transacción activa/
  );

  // 2. Con transacción activa debe ejecutar con lock pesimista
  await sequelize.transaction(async (t) => {
    const bloqueado = await inventarioRepository.findByIdForUpdate(inv.id, { transaction: t });
    assert.ok(bloqueado);
    assert.strictEqual(bloqueado.id, inv.id);
    assert.strictEqual(bloqueado.stock_actual, inv.stock_actual);
  });
});

test('InventarioRepository - G. findOrCreate() concurrente evita duplicados y maneja restricción única', async () => {
  const bodega = await Bodega.findOne();
  assert.ok(bodega);

  const libroTemp = await Libro.create({
    titulo: `Libro Concurrencia ${Date.now()}`,
    isbn: `C${Date.now()}`,
    resena: 'Prueba de concurrencia',
    precio: 19.99,
  });

  try {
    // Disparar 5 llamadas simultáneas a findOrCreate para el mismo libro y bodega
    const promesas = [1, 2, 3, 4, 5].map(() =>
      inventarioRepository.findOrCreate(libroTemp.id, bodega.id, 5)
    );

    const resultados = await Promise.all(promesas);

    const primerId = resultados[0].id;
    assert.ok(primerId, 'Debe haber un ID retornado');

    resultados.forEach((res) => {
      assert.strictEqual(res.id, primerId, 'Todas las llamadas concurrentes deben retornar el mismo ID');
    });

    const totalEnDb = await Inventario.count({
      where: { libro_id: libroTemp.id, bodega_id: bodega.id },
    });
    assert.strictEqual(totalEnDb, 1, 'Solo debe existir exactamente 1 registro en base de datos');
  } finally {
    await Inventario.destroy({ where: { libro_id: libroTemp.id } });
    await libroTemp.destroy();
  }
});

test('InventarioRepository - H. Cálculo de bajo_stock en findAllWithDetails()', async () => {
  const bajoStockItems = await inventarioRepository.findAllWithDetails({ estado: 'bajo_stock' });
  assert.ok(Array.isArray(bajoStockItems));

  bajoStockItems.forEach((item) => {
    assert.ok(
      item.stock_actual <= item.stock_minimo,
      `Item ${item.titulo} debe tener stock_actual (${item.stock_actual}) <= stock_minimo (${item.stock_minimo})`
    );
    assert.strictEqual(item.bajo_stock, true);
  });
});

test('InventarioRepository - I. Cálculo de agotados y titulos_con_stock en getResumen()', async () => {
  const resumen = await inventarioRepository.getResumen(90);

  assert.ok(typeof resumen.total_unidades === 'number');
  assert.ok(typeof resumen.titulos_con_stock === 'number');
  assert.ok(typeof resumen.bajo_stock === 'number');
  assert.ok(typeof resumen.agotados === 'number');
  assert.ok(typeof resumen.obsoletos === 'number');
  assert.ok(typeof resumen.libros_sin_precio === 'number');
  assert.ok(Array.isArray(resumen.alertas_bajo_stock));

  // Verificar coherencia directa con la base de datos
  const agotadosDirecto = await Inventario.count({ where: { stock_actual: 0 } });
  assert.strictEqual(resumen.agotados, agotadosDirecto);
});

test('InventarioRepository - J, K y L. Detección precisa de stock obsoleto (salida antigua, salida reciente, sin salida)', async () => {
  const bodega = await Bodega.findOne();
  const usuario = await Usuario.findOne();
  let tipoSalida = await TipoMovimiento.findOne({ where: sequelize.where(sequelize.fn('LOWER', sequelize.col('nombre')), 'salida') });
  if (!tipoSalida) {
    tipoSalida = await TipoMovimiento.create({ nombre: 'Salida' });
  }

  // 1. Caso J: Libro con salida antigua (> 90 días) -> Debe ser obsoleto = true
  const libroAntiguo = await Libro.create({
    titulo: `Libro Salida Vieja ${Date.now()}`,
    isbn: `V${Date.now()}`,
    resena: 'Prueba obsoleto',
    precio: 30,
  });

  // 2. Caso K: Libro con salida reciente (< 90 días) -> Debe ser obsoleto = false
  const libroReciente = await Libro.create({
    titulo: `Libro Salida Reciente ${Date.now()}`,
    isbn: `R${Date.now()}`,
    resena: 'Prueba no obsoleto',
    precio: 30,
  });

  // 3. Caso L: Libro creado hace > 90 días sin salidas y con stock -> obsoleto = true
  const libroSinSalidaViejo = await Libro.create({
    titulo: `Libro Sin Salida Viejo ${Date.now()}`,
    isbn: `S${Date.now()}`,
    resena: 'Prueba obsoleto sin salidas',
    precio: 30,
  });

  try {
    // Crear inventarios con stock > 0
    const invJ = await Inventario.create({
      libro_id: libroAntiguo.id,
      bodega_id: bodega.id,
      stock_actual: 5,
      stock_minimo: 2,
    });

    const invK = await Inventario.create({
      libro_id: libroReciente.id,
      bodega_id: bodega.id,
      stock_actual: 5,
      stock_minimo: 2,
    });

    const invL = await Inventario.create({
      libro_id: libroSinSalidaViejo.id,
      bodega_id: bodega.id,
      stock_actual: 5,
      stock_minimo: 2,
      creado_en: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 días atrás
    });

    // Registrar salida antigua (100 días atrás) para invJ
    const fechaAntigua = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await MovimientoInventario.create({
      inventario_id: invJ.id,
      usuario_id: usuario.id,
      tipo_movimiento_id: tipoSalida.id,
      cantidad: 1,
      motivo_detalle: 'Salida antigua de prueba',
      fecha_movimiento: fechaAntigua,
    });

    // Registrar salida reciente (2 días atrás) para invK
    const fechaReciente = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await MovimientoInventario.create({
      inventario_id: invK.id,
      usuario_id: usuario.id,
      tipo_movimiento_id: tipoSalida.id,
      cantidad: 1,
      motivo_detalle: 'Salida reciente de prueba',
      fecha_movimiento: fechaReciente,
    });

    // Consultar con findAllWithDetails
    const [detalleJ] = await inventarioRepository.findAllWithDetails({ q: libroAntiguo.isbn, diasStockObsoleto: 90 });
    const [detalleK] = await inventarioRepository.findAllWithDetails({ q: libroReciente.isbn, diasStockObsoleto: 90 });
    const [detalleL] = await inventarioRepository.findAllWithDetails({ q: libroSinSalidaViejo.isbn, diasStockObsoleto: 90 });

    assert.ok(detalleJ);
    assert.strictEqual(detalleJ.obsoleto, true, 'Libro con salida de hace 100 días debe ser obsoleto');

    assert.ok(detalleK);
    assert.strictEqual(detalleK.obsoleto, false, 'Libro con salida de hace 2 días NO debe ser obsoleto');

    assert.ok(detalleL);
    assert.strictEqual(detalleL.obsoleto, true, 'Libro sin salidas creado hace 120 días debe ser obsoleto');
  } finally {
    await MovimientoInventario.destroy({ where: { inventario_id: [libroAntiguo.id, libroReciente.id, libroSinSalidaViejo.id] } }).catch(() => {});
    await Inventario.destroy({ where: { libro_id: [libroAntiguo.id, libroReciente.id, libroSinSalidaViejo.id] } });
    await Libro.destroy({ where: { id: [libroAntiguo.id, libroReciente.id, libroSinSalidaViejo.id] } });
  }
});

test('InventarioRepository - M. libros_sin_precio cuenta libros activos con precio = 0 o NULL', async () => {
  const libroSinPrecio = await Libro.create({
    titulo: `Libro Gratis Test ${Date.now()}`,
    isbn: `G${Date.now()}`,
    resena: 'Sin precio',
    precio: 0,
    activo: true,
  });

  try {
    const resumen = await inventarioRepository.getResumen(90);
    assert.ok(resumen.libros_sin_precio >= 1, 'Debe contabilizar el libro sin precio');
  } finally {
    await libroSinPrecio.destroy();
  }
});

test('InventarioRepository - N. Alertas de bajo stock ordenadas por déficit crítico', async () => {
  const resumen = await inventarioRepository.getResumen(90);
  const alertas = resumen.alertas_bajo_stock;

  if (alertas.length > 1) {
    for (let i = 0; i < alertas.length - 1; i++) {
      const deficitActual = alertas[i].stock_actual - alertas[i].stock_minimo;
      const deficitSiguiente = alertas[i + 1].stock_actual - alertas[i + 1].stock_minimo;
      assert.ok(
        deficitActual <= deficitSiguiente,
        `Las alertas deben ordenarse en forma ascendente de déficit: ${deficitActual} <= ${deficitSiguiente}`
      );
    }
  }
});

test('InventarioRepository - O. Estructura exacta de campos retornados (Contrato JSON)', async () => {
  const lista = await inventarioRepository.findAllWithDetails({ limit: 1 });
  if (lista.length > 0) {
    const item = lista[0];
    const camposRequeridos = [
      'inventario_id',
      'libro_id',
      'titulo',
      'isbn',
      'imagen_url',
      'autor',
      'categoria',
      'bodega_id',
      'bodega_nombre',
      'sucursal_nombre',
      'stock_actual',
      'stock_minimo',
      'ultima_salida',
      'bajo_stock',
      'obsoleto',
    ];

    camposRequeridos.forEach((campo) => {
      assert.ok(campo in item, `El campo ${campo} debe estar presente en el resultado de findAllWithDetails`);
    });
  }
});

test('InventarioRepository comparte transacción Sequelize en lecturas/escrituras y revierte la creación', async () => {
  let libroId;
  let inventarioId;
  await assert.rejects(sequelize.transaction(async (transaction) => {
    const libro = await Libro.create({
      titulo: `Libro Rollback Inventario ${Date.now()}`,
      isbn: `IR${Date.now()}`,
      resena: 'Fixture transaccional',
      precio: 10,
    }, { transaction });
    libroId = libro.id;

    const creado = await inventarioRepository.findOrCreate(
      { transaction }, libro.id, baselineInventory.bodega_id, 4
    );
    inventarioId = creado.id;
    assert.equal(creado.stock_actual, 0);
    assert.equal(creado.stock_minimo, 4);

    const byWarehouse = await inventarioRepository.findByLibroAndBodega(
      libro.id, baselineInventory.bodega_id, { transaction }
    );
    assert.equal(byWarehouse.id, inventarioId);
    assert.equal((await inventarioRepository.findById(inventarioId, { transaction })).id, inventarioId);
    assert.ok((await inventarioRepository.findByLibroId(libro.id, { transaction }))
      .some((item) => item.id === inventarioId));

    const resumen = await inventarioRepository.getResumen(90, { transaction });
    assert.deepEqual(Object.keys(resumen), [
      'total_unidades',
      'titulos_con_stock',
      'bajo_stock',
      'agotados',
      'obsoletos',
      'libros_sin_precio',
      'alertas_bajo_stock',
    ]);
    for (const metric of [
      'total_unidades',
      'titulos_con_stock',
      'bajo_stock',
      'agotados',
      'obsoletos',
      'libros_sin_precio',
    ]) {
      assert.equal(typeof resumen[metric], 'number', `${metric} debe ser numérico`);
    }
    assert.ok(Array.isArray(resumen.alertas_bajo_stock));
    const agotadosEnTransaccion = await Inventario.count({
      where: { stock_actual: 0 },
      transaction,
    });
    assert.equal(resumen.agotados, agotadosEnTransaccion);

    throw new Error('ROLLBACK_SEQUELIZE_INVENTARIO_TEST');
  }), /ROLLBACK_SEQUELIZE_INVENTARIO_TEST/);

  assert.equal(await Inventario.findByPk(inventarioId), null);
  assert.equal(await Libro.findByPk(libroId), null);
});

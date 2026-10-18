const { after, before, test } = require('node:test');
const assert = require('node:assert');
const { sequelize } = require('../src/config/sequelize');
const db = require('../src/config/db');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const { Inventario, Libro, Bodega, TipoMovimiento, Usuario, MovimientoInventario } = require('../src/models');

let fixtureBook;
let fixtureInventory;

before(async () => {
  const seed = require('../src/database/seed');
  const { bodegaId } = await seed();
  fixtureBook = await Libro.create({
    titulo: `Libro Fixture Movimientos ${Date.now()}`,
    isbn: `M${Date.now()}`,
    resena: 'Fixture aislado para pruebas del trigger de movimientos',
    precio: 10,
  });
  const bodega = await Bodega.findByPk(bodegaId);
  fixtureInventory = await Inventario.create({
    libro_id: fixtureBook.id,
    bodega_id: bodega.id,
    stock_actual: 0,
    stock_minimo: 2,
  });
});

after(async () => {
  try {
    if (fixtureInventory) await fixtureInventory.destroy();
    if (fixtureBook) await fixtureBook.destroy();
  } finally {
    await Promise.allSettled([sequelize.close(), db.pool.end()]);
  }
});

test('MovimientoRepository - A. Buscar tipos de movimiento mediante Sequelize (case-insensitive)', async () => {
  const ingreso = await movimientoRepository.getTipoMovimientoByName('ingreso');
  assert.ok(ingreso, 'Debe encontrar tipo Ingreso');
  assert.strictEqual(ingreso.nombre, 'Ingreso');
  assert.ok(ingreso.id, 'Debe incluir ID');

  const salida = await movimientoRepository.getTipoMovimientoByName('SALIDA');
  assert.ok(salida, 'Debe encontrar tipo Salida');
  assert.strictEqual(salida.nombre, 'Salida');

  const noExiste = await movimientoRepository.getTipoMovimientoByName('TipoInexistenteXYZ');
  assert.strictEqual(noExiste, null);
});

test('MovimientoRepository - B y C. Crear tipo inexistente y evitar duplicación al asegurar tipo existente', async () => {
  const nombrePrueba = `Ajuste Test ${Date.now()}`;

  // 1. Crear nuevo tipo inexistente
  const creado = await movimientoRepository.ensureTipoMovimiento(
    nombrePrueba,
    'Descripción del movimiento de prueba'
  );
  assert.ok(creado.id, 'Debe generar un ID');
  assert.strictEqual(creado.nombre, nombrePrueba);

  // 2. Asegurar el mismo tipo nuevamente (debe ser idempotente, no duplicar)
  const asegurado = await movimientoRepository.ensureTipoMovimiento(
    nombrePrueba.toUpperCase(), // case-insensitive
    'Nueva descripción'
  );
  assert.strictEqual(asegurado.id, creado.id, 'Debe retornar el mismo ID sin duplicar');

  // Limpiar tipo de prueba
  await TipoMovimiento.destroy({ where: { id: creado.id } });
});

test('MovimientoRepository asegura un único tipo ante solicitudes concurrentes', async () => {
  const nombre = `Concurrente ${Date.now()}`;
  let tipoId;

  try {
    const tipos = await Promise.all(Array.from({ length: 4 }, () =>
      sequelize.transaction((transaction) => movimientoRepository.ensureTipoMovimiento(
        nombre,
        'Tipo concurrente de prueba',
        { transaction }
      ))
    ));

    tipoId = tipos[0].id;
    assert.ok(tipos.every((tipo) => tipo.id === tipoId));
    assert.equal(await TipoMovimiento.count({ where: { nombre } }), 1);
  } finally {
    await TipoMovimiento.destroy({ where: { nombre } });
  }
});

test('MovimientoRepository - D. createMovimiento con Sequelize y verificación del trigger (incremento exacto = 1 vez)', async () => {
  const t = await sequelize.transaction();
  try {
    // 1. Obtener un inventario existente y usuario para la prueba
    const inventario = await Inventario.findOne({ transaction: t });
    assert.ok(inventario, 'Debe existir un inventario registrado');

    const usuario = await Usuario.findOne({ transaction: t });
    assert.ok(usuario, 'Debe existir un usuario');

    const tipoIngreso = await movimientoRepository.getTipoMovimientoByName('Ingreso', { transaction: t });
    assert.ok(tipoIngreso, 'Debe existir tipo Ingreso');

    const stockInicial = inventario.stock_actual;
    const cantidadASumar = 3;

    // 2. Crear movimiento usando Sequelize ORM dentro de la transacción
    const mov = await movimientoRepository.createMovimiento(
      { transaction: t },
      {
        inventarioId: inventario.id,
        usuarioId: usuario.id,
        tipoMovimientoId: tipoIngreso.id,
        cantidad: cantidadASumar,
        motivoDetalle: 'Prueba de disparo de trigger PL/pgSQL con Sequelize',
      }
    );

    assert.ok(mov.id, 'Debe retornar el movimiento insertado');
    assert.strictEqual(mov.cantidad, cantidadASumar);

    // 3. Consultar el inventario para verificar que el trigger PL/pgSQL actualizó el stock
    const inventarioPostTrigger = await Inventario.findByPk(inventario.id, { transaction: t });
    assert.strictEqual(
      inventarioPostTrigger.stock_actual,
      stockInicial + cantidadASumar,
      'El trigger PL/pgSQL debe incrementar el stock exactamente en la cantidad del movimiento (sin duplicación)'
    );

    // Revertir para mantener la base de datos limpia
    await t.rollback();
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

test('MovimientoRepository - E. Rollback revierte tanto el movimiento como el stock actualizado por el trigger', async () => {
  const inventarioAntes = await Inventario.findOne();
  assert.ok(inventarioAntes, 'Debe existir un inventario');
  const stockInicial = inventarioAntes.stock_actual;

  const usuario = await Usuario.findOne();
  const tipoIngreso = await movimientoRepository.getTipoMovimientoByName('Ingreso');

  let movimientoIdCreado = null;

  try {
    await sequelize.transaction(async (t) => {
      const mov = await movimientoRepository.createMovimiento(
        { transaction: t },
        {
          inventarioId: inventarioAntes.id,
          usuarioId: usuario.id,
          tipoMovimientoId: tipoIngreso.id,
          cantidad: 10,
          motivoDetalle: 'Movimiento que será abortado',
        }
      );
      movimientoIdCreado = mov.id;

      // Dentro de la transacción el trigger ya sumó 10
      const enTransaccion = await Inventario.findByPk(inventarioAntes.id, { transaction: t });
      assert.strictEqual(enTransaccion.stock_actual, stockInicial + 10);

      // Inducir error para forzar rollback
      throw new Error('ROLLBACK_INTENCIONAL_MOVIMIENTO');
    });
  } catch (err) {
    assert.strictEqual(err.message, 'ROLLBACK_INTENCIONAL_MOVIMIENTO');
  }

  // Verificar fuera de la transacción:
  // 1. El stock volvió al valor inicial
  const inventarioDespues = await Inventario.findByPk(inventarioAntes.id);
  assert.strictEqual(
    inventarioDespues.stock_actual,
    stockInicial,
    'El stock del inventario debe haberse revertido al valor original tras el rollback'
  );

  // 2. El movimiento no existe en la base de datos
  const movExiste = await MovimientoInventario.findByPk(movimientoIdCreado);
  assert.strictEqual(movExiste, null, 'El movimiento no debe persistir tras el rollback');
});

test('MovimientoRepository - F. findAllWithFilters() con Sequelize soporta paginación, filtros y estructura de datos', async () => {
  // 1. Consulta general
  const resultado = await movimientoRepository.findAllWithFilters({ limit: 5, offset: 0 });
  assert.ok(typeof resultado.total === 'number');
  assert.strictEqual(resultado.limit, 5);
  assert.strictEqual(resultado.offset, 0);
  assert.ok(Array.isArray(resultado.movimientos));

  if (resultado.movimientos.length > 0) {
    const primerMov = resultado.movimientos[0];
    assert.ok(primerMov.id, 'Debe tener id');
    assert.ok(primerMov.fecha_movimiento, 'Debe tener fecha_movimiento');
    assert.ok(primerMov.tipo, 'Debe tener tipo');
    assert.ok(typeof primerMov.cantidad === 'number', 'Cantidad debe ser numérica');
    assert.ok('titulo' in primerMov, 'Debe contener campo titulo');
    assert.ok('bodega_nombre' in primerMov, 'Debe contener bodega_nombre');
    assert.ok('usuario_nombre' in primerMov, 'Debe contener usuario_nombre');
  }

  // 2. Filtro por tipo case-insensitive
  const soloIngresos = await movimientoRepository.findAllWithFilters({ tipo: 'ingreso', limit: 10 });
  soloIngresos.movimientos.forEach((m) => {
    assert.strictEqual(m.tipo.toLowerCase(), 'ingreso', 'Solo debe retornar movimientos de tipo Ingreso');
  });

  // 3. Paginación con offset
  if (resultado.total > 2) {
    const pagina1 = await movimientoRepository.findAllWithFilters({ limit: 2, offset: 0 });
    const pagina2 = await movimientoRepository.findAllWithFilters({ limit: 2, offset: 2 });
    assert.notStrictEqual(
      pagina1.movimientos[0]?.id,
      pagina2.movimientos[0]?.id,
      'Páginas con distinto offset deben tener registros diferentes'
    );
  }
});

test('MovimientoRepository comparte transacción Sequelize y revierte tipos creados al fallar', async () => {
  const nombre = `Rollback ${Date.now()}`;
  let tipoId;

  await assert.rejects(sequelize.transaction(async (transaction) => {
    const creado = await movimientoRepository.ensureTipoMovimiento(
      nombre, 'Tipo temporal de prueba', { transaction }
    );
    tipoId = creado.id;

    const encontrado = await movimientoRepository.getTipoMovimientoByName(nombre, { transaction });
    assert.equal(encontrado.id, tipoId);
    assert.equal(encontrado.nombre, nombre);
    throw new Error('ROLLBACK_SEQUELIZE_TIPO_MOVIMIENTO_TEST');
  }), /ROLLBACK_SEQUELIZE_TIPO_MOVIMIENTO_TEST/);

  assert.equal(await TipoMovimiento.findByPk(tipoId), null);
});

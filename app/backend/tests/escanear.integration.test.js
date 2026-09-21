const test = require('node:test');
const assert = require('node:assert');
const db = require('../src/config/db');
const seed = require('../src/database/seed');
const libroService = require('../src/services/libro.service');
const libroRepository = require('../src/repositories/libro.repository');
const inventarioRepository = require('../src/repositories/inventario.repository');

test('Test de Integración: Flujo Completo POST /api/libros/escanear con Transacciones ACID', async (t) => {
  let seededData;

  await t.test('Paso 0: Conexión y Sembrado de Datos de Prueba', async () => {
    seededData = await seed();
    assert.ok(seededData.bodegaId, 'Debe existir una bodegaId válida');
    assert.ok(seededData.usuarioId, 'Debe existir un usuarioId válido');
  });

  await t.test('Paso 1: Validación de campos requeridos', async () => {
    await assert.rejects(
      async () => {
        await libroService.escanearLibro({ isbn: '', bodegaId: seededData.bodegaId, usuarioId: seededData.usuarioId });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await libroService.escanearLibro({ isbn: '9780132350884', bodegaId: null, usuarioId: seededData.usuarioId });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test('Paso 2: Rechazo si bodega o usuario no existen', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await assert.rejects(
      async () => {
        await libroService.escanearLibro({
          isbn: '9780132350884',
          bodegaId: fakeUuid,
          usuarioId: seededData.usuarioId,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  let libroId;
  let inventarioId;

  await t.test('Paso 3: Escaneo de libro nuevo (consulta externa, registro atómico e ingreso de stock = 1)', async () => {
    const isbn = '9780132350884'; // Clean Code

    // Limpiar si existía previamente para prueba limpia
    await db.query('DELETE FROM libros WHERE isbn = $1', [isbn]);

    const res = await libroService.escanearLibro({
      isbn,
      bodegaId: seededData.bodegaId,
      usuarioId: seededData.usuarioId,
    });

    assert.strictEqual(res.es_nuevo_en_catalogo, true);
    assert.strictEqual(res.movimiento.tipo, 'Ingreso');
    assert.strictEqual(res.movimiento.cantidad, 1);
    assert.strictEqual(res.inventario.stock_anterior, 0);
    assert.strictEqual(res.inventario.stock_actual, 1);

    // Guardar para paso posterior
    libroId = res.libro.id;
    inventarioId = res.inventario.id;

    // Verificar en BD que el libro y el inventario existan con stock 1
    const libroDb = await libroRepository.findById(libroId);
    assert.ok(libroDb);
    assert.strictEqual(libroDb.isbn, isbn);

    const invDb = await inventarioRepository.findById(inventarioId);
    assert.strictEqual(invDb.stock_actual, 1);
  });

  await t.test('Paso 4: Segundo escaneo del mismo libro (ON CONFLICT, reuso y aumento de stock = 2)', async () => {
    const isbn = '9780132350884';

    const res = await libroService.escanearLibro({
      isbn,
      bodegaId: seededData.bodegaId,
      usuarioId: seededData.usuarioId,
    });

    assert.strictEqual(res.es_nuevo_en_catalogo, false);
    assert.strictEqual(res.libro.id, libroId, 'Debe reutilizar el mismo libro previamente registrado');
    assert.strictEqual(res.inventario.stock_anterior, 1);
    assert.strictEqual(res.inventario.stock_actual, 2);

    // Verificar en BD que no se hayan duplicado los libros
    const countLibros = await db.query('SELECT COUNT(*) FROM libros WHERE isbn = $1', [isbn]);
    assert.strictEqual(parseInt(countLibros.rows[0].count, 10), 1, 'No deben existir duplicados del libro');

    // Verificar que existan 2 movimientos de inventario registrados
    const countMovs = await db.query('SELECT COUNT(*) FROM movimientos_inventario WHERE inventario_id = $1', [inventarioId]);
    assert.strictEqual(parseInt(countMovs.rows[0].count, 10), 2, 'Deben existir 2 movimientos de ingreso');
  });

  await t.test('Paso 5: Verificación de Atomicidad y Rollback en caso de falla inducida', async () => {
    // Si la transacción falla a mitad de camino, no deben quedar movimientos huérfanos
    const countMovsAntes = await db.query('SELECT COUNT(*) FROM movimientos_inventario;');
    const totalAntes = parseInt(countMovsAntes.rows[0].count, 10);

    const fakeUsuarioId = '99999999-9999-9999-9999-999999999999';

    await assert.rejects(
      async () => {
        await libroService.escanearLibro({
          isbn: '9780132350884',
          bodegaId: seededData.bodegaId,
          usuarioId: fakeUsuarioId,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    const countMovsDespues = await db.query('SELECT COUNT(*) FROM movimientos_inventario;');
    const totalDespues = parseInt(countMovsDespues.rows[0].count, 10);

    assert.strictEqual(totalDespues, totalAntes, 'El rollback debe prevenir inserción parcial de movimientos');
  });

  // Cerrar pool al finalizar
  await t.test('Paso Final: Cierre de conexiones a la base de datos', async () => {
    await db.pool.end();
  });
});

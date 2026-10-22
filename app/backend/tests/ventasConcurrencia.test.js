const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Venta, VentaDetalle, MovimientoInventario } = require('../src/models');
const ventaService = require('../src/services/venta.service');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const { NotFoundError, ConflictError } = require('../src/utils/errors');
const { crearEntorno } = require('./helpers/ventasFixtures');

let env;
let admin;
let empleado;

before(async () => {
  env = await crearEntorno('vcon');
  admin = env.usuarios.Administrador;
  empleado = env.usuarios.Empleado;
});

after(async () => {
  try {
    await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

const vender = (items, extra = {}) => ventaService.crearVenta({
  bodegaId: env.bodega.id,
  metodoPago: 'Efectivo',
  usuarioId: empleado.id,
  items,
  ...extra,
});

// Verifica que el rechazo no dejó rastro: ni ventas, ni movimientos, ni cambios de stock.
async function assertSinPersistir(accion, claseError) {
  const antes = await env.conteos();
  await assert.rejects(accion(), (error) => {
    assert.ok(error instanceof claseError, `se esperaba ${claseError.name}, llegó ${error.name}: ${error.message}`);
    return true;
  });
  assert.deepEqual(await env.conteos(), antes);
}

// -------------------- d) Concurrencia

test('d-i) Dos ventas simultáneas de la última unidad: una se confirma, la otra 409', async () => {
  for (let ronda = 0; ronda < 5; ronda += 1) {
    const a = await env.crearLibro({ precio: 10, stock: 1 });
    const resultados = await Promise.allSettled([
      vender([{ libroId: a.libro.id, cantidad: 1 }]),
      vender([{ libroId: a.libro.id, cantidad: 1 }]),
    ]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const fallos = resultados.filter((r) => r.status === 'rejected');
    assert.equal(ok.length, 1, `ronda ${ronda}`);
    assert.equal(fallos.length, 1, `ronda ${ronda}`);
    assert.ok(fallos[0].reason instanceof ConflictError, fallos[0].reason.message);
    assert.equal(await env.stockDe(a.inventario), 0);
    assert.equal(await MovimientoInventario.count({ where: { venta_id: ok[0].value.id } }), 1);
  }
});

test('d-ii) 20 ventas simultáneas con líneas [A,B] y [B,A]: todas se confirman sin deadlock', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 100 });
  const b = await env.crearLibro({ precio: 5, stock: 100 });
  const ab = [{ libroId: a.libro.id, cantidad: 1 }, { libroId: b.libro.id, cantidad: 2 }];
  const ba = [{ libroId: b.libro.id, cantidad: 2 }, { libroId: a.libro.id, cantidad: 1 }];

  const resultados = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) => vender(i % 2 === 0 ? ab : ba))
  );
  const fallos = resultados.filter((r) => r.status === 'rejected');
  assert.equal(fallos.length, 0, fallos.map((f) => `${f.reason.code || ''} ${f.reason.message}`).join(' | '));

  assert.equal(await env.stockDe(a.inventario), 80);
  assert.equal(await env.stockDe(b.inventario), 60);
  const numeros = new Set(resultados.map((r) => r.value.numero));
  assert.equal(numeros.size, 20);
});

// -------------------- e) Anulación (servicio)

test('e) Anular restituye el stock con Ingreso + venta_id y marca la venta', async () => {
  const a = await env.crearLibro({ precio: '10.00', stock: 6 });
  const b = await env.crearLibro({ precio: '4.50', stock: 3 });
  const venta = await vender([{ libroId: a.libro.id, cantidad: 4 }, { libroId: b.libro.id, cantidad: 3 }]);
  assert.equal(await env.stockDe(a.inventario), 2);
  assert.equal(await env.stockDe(b.inventario), 0);

  const anulada = await ventaService.anularVenta({ ventaId: venta.id, motivo: '  Error de digitación ', usuarioId: admin.id });
  assert.equal(anulada.estado, 'Anulada');
  assert.deepEqual(anulada.anulada_por, { id: admin.id, nombre_completo: admin.nombre_completo });
  assert.ok(anulada.anulada_en);
  assert.equal(anulada.motivo_anulacion, 'Error de digitación');
  assert.equal(await env.stockDe(a.inventario), 6);
  assert.equal(await env.stockDe(b.inventario), 3);

  const ingresos = await MovimientoInventario.findAll({
    where: { venta_id: venta.id, motivo_detalle: `Anulación de venta ${venta.codigo}: Error de digitación` },
  });
  assert.equal(ingresos.length, 2);
  assert.equal(await MovimientoInventario.count({ where: { venta_id: venta.id } }), 4);
});

test('e) Anular dos veces → 409 sin tocar el stock; inexistente → 404', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 3 });
  const venta = await vender([{ libroId: a.libro.id, cantidad: 2 }]);
  await ventaService.anularVenta({ ventaId: venta.id, motivo: 'x', usuarioId: admin.id });
  const antes = await env.conteos();
  await assert.rejects(
    ventaService.anularVenta({ ventaId: venta.id, motivo: 'otra vez', usuarioId: admin.id }),
    ConflictError
  );
  assert.deepEqual(await env.conteos(), antes);
  await assert.rejects(
    ventaService.anularVenta({ ventaId: '5a215402-f1fb-45a2-b20c-a5816e0445a0', motivo: 'x', usuarioId: admin.id }),
    NotFoundError
  );
});

test('e) Dos anulaciones simultáneas: una gana, la otra 409 y el stock se restituye una sola vez', async () => {
  for (let ronda = 0; ronda < 3; ronda += 1) {
    const a = await env.crearLibro({ precio: 10, stock: 5 });
    const venta = await vender([{ libroId: a.libro.id, cantidad: 3 }]);
    const resultados = await Promise.allSettled([
      ventaService.anularVenta({ ventaId: venta.id, motivo: 'A', usuarioId: admin.id }),
      ventaService.anularVenta({ ventaId: venta.id, motivo: 'B', usuarioId: admin.id }),
    ]);
    assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1, `ronda ${ronda}`);
    const rechazo = resultados.find((r) => r.status === 'rejected');
    assert.ok(rechazo.reason instanceof ConflictError, rechazo.reason.message);
    assert.equal(await env.stockDe(a.inventario), 5);
    const ingresos = await MovimientoInventario.count({ where: { venta_id: venta.id } });
    assert.equal(ingresos, 2); // 1 Salida + 1 Ingreso
    assert.equal((await Venta.findByPk(venta.id)).estado, 'Anulada');
  }
});

test('e) Anular no deja medias tintas si falla un movimiento (rollback)', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 5 });
  const b = await env.crearLibro({ precio: 10, stock: 5 });
  const venta = await vender([{ libroId: a.libro.id, cantidad: 2 }, { libroId: b.libro.id, cantidad: 2 }]);
  const antes = await env.conteos();
  const original = movimientoRepository.createMovimiento;
  let llamadas = 0;
  movimientoRepository.createMovimiento = async function parcheado(...args) {
    llamadas += 1;
    if (llamadas === 2) throw new Error('Fallo simulado al anular');
    return original.apply(this, args);
  };
  try {
    await assert.rejects(ventaService.anularVenta({ ventaId: venta.id, motivo: 'x', usuarioId: admin.id }), /Fallo simulado/);
  } finally {
    movimientoRepository.createMovimiento = original;
  }
  assert.deepEqual(await env.conteos(), antes);
  assert.equal((await Venta.findByPk(venta.id)).estado, 'Completada');
});

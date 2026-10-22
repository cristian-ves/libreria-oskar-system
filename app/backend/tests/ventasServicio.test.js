const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, VentaDetalle, MovimientoInventario } = require('../src/models');
const ventaService = require('../src/services/venta.service');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../src/utils/errors');
const { crearEntorno } = require('./helpers/ventasFixtures');

let env;
let admin;
let empleado;

before(async () => {
  env = await crearEntorno('vsrv');
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

// -------------------- a) Crear

test('a) Crea una venta de 2 líneas con descuento: importes exactos, stock y movimientos', async () => {
  const a = await env.crearLibro({ precio: '85.50', stock: 10 });
  const b = await env.crearLibro({ precio: '19.99', stock: 5 });

  const venta = await vender(
    [{ libroId: a.libro.id, cantidad: 2 }, { libroId: b.libro.id, cantidad: 3 }],
    // precio, subtotal, total y usuarioId del body deben ignorarse
    { descuento: '10.50', usuarioId: empleado.id, precio: 1, subtotal: 1, total: 1 }
  );

  // 2*85.50 + 3*19.99 = 171.00 + 59.97 = 230.97 ; total = 230.97 - 10.50 = 220.47
  assert.equal(venta.subtotal, '230.97');
  assert.equal(venta.descuento, '10.50');
  assert.equal(venta.total, '220.47');
  assert.equal(venta.estado, 'Completada');
  assert.match(venta.codigo, /^V-\d{6,}$/);
  assert.equal(venta.codigo, `V-${String(venta.numero).padStart(6, '0')}`);
  assert.equal(venta.vendedor.id, empleado.id);
  assert.equal(venta.cliente_nombre, 'Consumidor final');
  assert.equal(venta.cliente_nit, null);
  assert.equal(venta.anulada_por, null);
  assert.equal(venta.bodega.id, env.bodega.id);

  const lineaA = venta.detalles.find((d) => d.libro_id === a.libro.id);
  assert.deepEqual(lineaA, {
    libro_id: a.libro.id, titulo: a.libro.titulo, isbn: a.libro.isbn,
    cantidad: 2, precio_unitario: '85.50', subtotal: '171.00',
  });
  assert.equal(venta.detalles.find((d) => d.libro_id === b.libro.id).subtotal, '59.97');

  assert.equal(await env.stockDe(a.inventario), 8);
  assert.equal(await env.stockDe(b.inventario), 2);

  const movs = await MovimientoInventario.findAll({ where: { venta_id: venta.id } });
  assert.equal(movs.length, 2);
  for (const m of movs) {
    assert.equal(m.usuario_id, empleado.id);
    assert.equal(m.motivo_detalle, `Venta ${venta.codigo}`);
  }
  assert.deepEqual(movs.map((m) => m.cantidad).sort(), [2, 3]);
});

test('a) El precio unitario es el de la BD en el momento de la venta (snapshot)', async () => {
  const a = await env.crearLibro({ precio: '12.00', stock: 4 });
  const primera = await vender([{ libroId: a.libro.id, cantidad: 1 }], { precio: '0.01' });
  await a.libro.update({ precio: '15.25' });
  const segunda = await vender([{ libroId: a.libro.id, cantidad: 1 }]);

  assert.equal(primera.detalles[0].precio_unitario, '12.00');
  assert.equal(segunda.detalles[0].precio_unitario, '15.25');
  const guardada = await VentaDetalle.findOne({ where: { venta_id: primera.id } });
  assert.equal(guardada.precio_unitario, '12.00');
});

test('a) Vendedor = usuarioId autenticado y defaults/normalización de cliente', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 3 });
  const venta = await vender([{ libroId: a.libro.id.toUpperCase(), cantidad: 1 }], {
    usuarioId: admin.id, clienteNombre: '   ', clienteNit: '  ', notas: ' nota ',
  });
  assert.equal(venta.vendedor.id, admin.id);
  assert.equal(venta.cliente_nombre, 'Consumidor final');
  assert.equal(venta.cliente_nit, null);
  assert.equal(venta.notas, 'nota');

  const conCliente = await vender([{ libroId: a.libro.id, cantidad: 1 }], {
    clienteNombre: ' Ana López ', clienteNit: '1234567-8', metodoPago: 'Transferencia',
  });
  assert.equal(conCliente.cliente_nombre, 'Ana López');
  assert.equal(conCliente.cliente_nit, '1234567-8');
  assert.equal(conCliente.metodo_pago, 'Transferencia');
});

test('a) Descuento igual al subtotal deja total 0', async () => {
  const a = await env.crearLibro({ precio: '7.25', stock: 2 });
  const venta = await vender([{ libroId: a.libro.id, cantidad: 2 }], { descuento: 14.5 });
  assert.equal(venta.subtotal, '14.50');
  assert.equal(venta.total, '0.00');
});

// -------------------- b) Rechazos

test('b) Libro con precio 0 → 409 con el título, sin persistir', async () => {
  const sinPrecio = await env.crearLibro({ titulo: 'Libro gratis fixture', precio: 0, stock: 5 });
  const conPrecio = await env.crearLibro({ precio: 10, stock: 5 });
  const antes = await env.conteos();
  await assert.rejects(
    vender([{ libroId: conPrecio.libro.id, cantidad: 1 }, { libroId: sinPrecio.libro.id, cantidad: 1 }]),
    (e) => e instanceof ConflictError && e.message.includes('Libro gratis fixture')
  );
  assert.deepEqual(await env.conteos(), antes);
});

test('b) Stock insuficiente → 409 con el título de CADA libro afectado, sin persistir', async () => {
  const a = await env.crearLibro({ titulo: 'Escaso Uno', precio: 10, stock: 2 });
  const b = await env.crearLibro({ titulo: 'Escaso Dos', precio: 10, stock: 1 });
  const c = await env.crearLibro({ titulo: 'Suficiente', precio: 10, stock: 9 });
  const antes = await env.conteos();
  await assert.rejects(
    vender([
      { libroId: a.libro.id, cantidad: 3 },
      { libroId: b.libro.id, cantidad: 4 },
      { libroId: c.libro.id, cantidad: 1 },
    ]),
    (e) => {
      assert.ok(e instanceof ConflictError);
      assert.equal(
        e.message,
        'Stock insuficiente: «Escaso Uno» (disponible 2, solicitado 3); «Escaso Dos» (disponible 1, solicitado 4)'
      );
      return true;
    }
  );
  assert.deepEqual(await env.conteos(), antes);
});

test('b) Libro inexistente → 404; bodega inexistente o inactiva → 404', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 2 });
  const fantasma = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }, { libroId: fantasma, cantidad: 1 }]), NotFoundError);
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { bodegaId: fantasma }), NotFoundError);
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { bodegaId: env.bodegaInactiva.id }), NotFoundError);
});

test('b) Libro sin inventario en la bodega → 409 (stock 0), sin crear inventario', async () => {
  const sinInv = await env.crearLibro({ titulo: 'Sin inventario fixture', precio: 10, stock: null });
  const antes = await env.conteos();
  await assert.rejects(
    vender([{ libroId: sinInv.libro.id, cantidad: 1 }]),
    (e) => e instanceof ConflictError && e.message.includes('«Sin inventario fixture» (disponible 0, solicitado 1)')
  );
  assert.deepEqual(await env.conteos(), antes);
});

test('b) Descuento mayor que el subtotal → 400, sin persistir', async () => {
  const a = await env.crearLibro({ precio: '10.00', stock: 3 });
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { descuento: '10.01' }), ValidationError);
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { descuento: '3 decimales' }), ValidationError);
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { descuento: '1.005' }), ValidationError);
  await assertSinPersistir(() => vender([{ libroId: a.libro.id, cantidad: 1 }], { descuento: -1 }), ValidationError);
});

test('b) Subtotal fuera del rango de NUMERIC(10,2) → 400 (nunca 500), sin persistir', async () => {
  const caro = await env.crearLibro({ precio: '99999999.99', stock: 3 });
  const otro = await env.crearLibro({ precio: '50000000.00', stock: 3 });
  // una línea que desborda (2 × 99999999.99)
  await assertSinPersistir(() => vender([{ libroId: caro.libro.id, cantidad: 2 }]), ValidationError);
  // la suma de líneas desborda aunque cada una cabe
  await assertSinPersistir(() => vender([{ libroId: caro.libro.id, cantidad: 1 }, { libroId: otro.libro.id, cantidad: 1 }]), ValidationError);
  // exactamente el máximo sí es válido
  const venta = await vender([{ libroId: caro.libro.id, cantidad: 1 }]);
  assert.equal(venta.total, '99999999.99');
});

// -------------------- c) Rollback

test('c) Rollback: si falla el movimiento de la segunda línea no queda nada', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 5 });
  const b = await env.crearLibro({ precio: 20, stock: 5 });
  const antes = await env.conteos();
  const original = movimientoRepository.createMovimiento;
  let llamadas = 0;
  movimientoRepository.createMovimiento = async function parcheado(...args) {
    llamadas += 1;
    if (llamadas === 2) throw new Error('Fallo simulado en la segunda línea');
    return original.apply(this, args);
  };
  try {
    await assert.rejects(
      vender([{ libroId: a.libro.id, cantidad: 1 }, { libroId: b.libro.id, cantidad: 1 }]),
      /Fallo simulado/
    );
  } finally {
    movimientoRepository.createMovimiento = original;
  }
  assert.equal(llamadas, 2);
  assert.deepEqual(await env.conteos(), antes);
  assert.equal(await VentaDetalle.count({ where: { libro_id: [a.libro.id, b.libro.id] } }), 0);
  assert.equal(await env.stockDe(a.inventario), 5);
  assert.equal(await env.stockDe(b.inventario), 5);
});


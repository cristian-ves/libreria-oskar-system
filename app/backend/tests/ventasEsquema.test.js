const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  sequelize,
  Sucursal,
  Bodega,
  Rol,
  Usuario,
  Libro,
  Inventario,
  TipoMovimiento,
  MovimientoInventario,
  Venta,
  VentaDetalle,
} = require('../src/models');

const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

const tag = Date.now().toString();
const fixtures = { sucursal: null, bodega: null, usuario: null, libros: [], inventario: null };
let tipoSalida;
let tipoIngreso;

// ISBN-13 válido con prefijo 978 y dígito de control calculado.
function isbn13(seed) {
  const body = `978${String(seed).padStart(9, '0').slice(-9)}`;
  const sum = body.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

async function makeLibro(n, precio = 10) {
  const libro = await Libro.create({
    titulo: `Esquema ventas ${n} ${tag}`,
    isbn: isbn13(Number(tag.slice(-8)) * 10 + n),
    resena: 'Fixture aislado para el esquema de ventas',
    precio,
  });
  fixtures.libros.push(libro);
  return libro;
}

function ventaData(overrides = {}) {
  return {
    bodega_id: fixtures.bodega.id,
    usuario_id: fixtures.usuario.id,
    metodo_pago: 'Efectivo',
    subtotal: 20,
    descuento: 0,
    total: 20,
    ...overrides,
  };
}

async function crearVenta(overrides = {}) {
  return Venta.create(ventaData(overrides));
}

async function assertDbCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.original && error.original.code, code, error.message);
    return true;
  });
}

before(async () => {
  fixtures.sucursal = await Sucursal.create({ nombre: `Suc ventas ${tag}`, direccion: 'Fixture' });
  fixtures.bodega = await Bodega.create({ sucursal_id: fixtures.sucursal.id, nombre: `Bod ventas ${tag}` });
  const rol = await Rol.findOne({ where: { nombre: 'Empleado' } });
  assert.ok(rol, 'Debe existir el rol Empleado');
  fixtures.usuario = await Usuario.create({
    rol_id: rol.id,
    nombre_completo: 'Vendedor esquema',
    email: `ventas-esquema-${tag}@example.test`,
    password_hash: 'no-es-un-hash-real',
  });
  tipoSalida = await TipoMovimiento.findOne({ where: { nombre: 'Salida' } });
  tipoIngreso = await TipoMovimiento.findOne({ where: { nombre: 'Ingreso' } });
  assert.ok(tipoSalida && tipoIngreso);
});

after(async () => {
  try {
    const libroIds = fixtures.libros.map((l) => l.id);
    const inventarios = await Inventario.findAll({ where: { bodega_id: fixtures.bodega.id } });
    const inventarioIds = inventarios.map((i) => i.id);
    const ventas = await Venta.findAll({ where: { bodega_id: fixtures.bodega.id }, attributes: ['id'] });
    const ventaIds = ventas.map((v) => v.id);

    await MovimientoInventario.destroy({ where: { inventario_id: inventarioIds } });
    await MovimientoInventario.destroy({ where: { venta_id: ventaIds } });
    await Venta.destroy({ where: { id: ventaIds } }); // venta_detalles cae en cascada
    await Inventario.destroy({ where: { id: inventarioIds } });
    await Libro.destroy({ where: { id: libroIds } });
    await Usuario.destroy({ where: { id: fixtures.usuario.id } });
    await Bodega.destroy({ where: { id: fixtures.bodega.id } });
    await Sucursal.destroy({ where: { id: fixtures.sucursal.id } });
  } finally {
    await sequelize.close();
  }
});

test('Venta con dos detalles en una transacción: numero lo asigna la BD y crece', async () => {
  const libroA = await makeLibro(1, 10);
  const libroB = await makeLibro(2, 5.5);

  const venta = await sequelize.transaction(async (transaction) => {
    const created = await Venta.create(
      ventaData({ subtotal: 25.5, descuento: 0.5, total: 25 }),
      { transaction }
    );
    await VentaDetalle.create(
      { venta_id: created.id, libro_id: libroA.id, cantidad: 2, precio_unitario: 10, subtotal: 20 },
      { transaction }
    );
    await VentaDetalle.create(
      { venta_id: created.id, libro_id: libroB.id, cantidad: 1, precio_unitario: 5.5, subtotal: 5.5 },
      { transaction }
    );
    return created;
  });

  assert.ok(Number.isInteger(venta.numero) && venta.numero > 0, `numero poblado: ${venta.numero}`);
  const detalles = await VentaDetalle.findAll({ where: { venta_id: venta.id } });
  assert.equal(detalles.length, 2);

  const segunda = await crearVenta();
  assert.ok(segunda.numero > venta.numero);
});

test('Valores por defecto de ventas', async () => {
  const venta = await crearVenta();
  const fresca = await Venta.findByPk(venta.id);
  assert.equal(fresca.cliente_nombre, 'Consumidor final');
  assert.equal(Number(fresca.descuento), 0);
  assert.equal(fresca.estado, 'Completada');
  assert.ok(fresca.creado_en instanceof Date && !Number.isNaN(fresca.creado_en.getTime()));
  assert.equal(fresca.cliente_nit, null);
  assert.equal(fresca.anulada_en, null);
});

test('La BD rechaza ventas incoherentes con CHECK', async () => {
  const sinValidar = { validate: false };
  const casos = [
    ['metodo_pago inválido', { metodo_pago: 'Cheque' }],
    ['estado inválido', { estado: 'Pendiente' }],
    ['total distinto de subtotal - descuento', { subtotal: 20, descuento: 5, total: 20 }],
    ['descuento mayor que el subtotal', { subtotal: 20, descuento: 30, total: -10 }],
    ['Anulada sin anulada_en/anulada_por', { estado: 'Anulada' }],
    ['Completada con anulada_en', { anulada_en: new Date() }],
  ];
  for (const [nombre, overrides] of casos) {
    await assertDbCode(Venta.create(ventaData(overrides), sinValidar), CHECK_VIOLATION).catch((e) => {
      e.message = `${nombre}: ${e.message}`;
      throw e;
    });
  }
});

test('La BD rechaza detalles incoherentes con CHECK y libro repetido con UNIQUE', async () => {
  const libro = await makeLibro(3, 10);
  const venta = await crearVenta();
  const base = { venta_id: venta.id, libro_id: libro.id, cantidad: 2, precio_unitario: 10, subtotal: 20 };
  const sinValidar = { validate: false };

  await assertDbCode(VentaDetalle.create({ ...base, cantidad: 0, subtotal: 0 }, sinValidar), CHECK_VIOLATION);
  await assertDbCode(VentaDetalle.create({ ...base, precio_unitario: 0, subtotal: 0 }, sinValidar), CHECK_VIOLATION);
  await assertDbCode(VentaDetalle.create({ ...base, subtotal: 19 }, sinValidar), CHECK_VIOLATION);

  await VentaDetalle.create(base);
  await assertDbCode(VentaDetalle.create(base), UNIQUE_VIOLATION);
});

test('Las FK RESTRICT impiden borrar libro, usuario o venta con dependientes', async () => {
  const libro = await makeLibro(4, 10);
  const rol = await Rol.findOne({ where: { nombre: 'Empleado' } });
  const otroUsuario = await Usuario.create({
    rol_id: rol.id,
    nombre_completo: 'Otro vendedor esquema',
    email: `ventas-esquema-otro-${tag}@example.test`,
    password_hash: 'no-es-un-hash-real',
  });
  const venta = await crearVenta({ usuario_id: otroUsuario.id });
  await VentaDetalle.create({ venta_id: venta.id, libro_id: libro.id, cantidad: 2, precio_unitario: 10, subtotal: 20 });

  await assertDbCode(Libro.destroy({ where: { id: libro.id } }), FK_VIOLATION);
  await assertDbCode(Usuario.destroy({ where: { id: otroUsuario.id } }), FK_VIOLATION);

  const inventario = await Inventario.create({ libro_id: libro.id, bodega_id: fixtures.bodega.id, stock_minimo: 1 });
  await MovimientoInventario.create({
    inventario_id: inventario.id,
    usuario_id: fixtures.usuario.id,
    tipo_movimiento_id: tipoIngreso.id,
    cantidad: 3,
  });
  await MovimientoInventario.create({
    inventario_id: inventario.id,
    usuario_id: fixtures.usuario.id,
    tipo_movimiento_id: tipoSalida.id,
    cantidad: 1,
    venta_id: venta.id,
  });
  await assertDbCode(Venta.destroy({ where: { id: venta.id } }), FK_VIOLATION);

  // Limpieza del usuario auxiliar: primero la venta y sus movimientos.
  await MovimientoInventario.destroy({ where: { inventario_id: inventario.id } });
  await Venta.destroy({ where: { id: venta.id } });
  await Usuario.destroy({ where: { id: otroUsuario.id } });
});

test('Salida con venta_id: el trigger descuenta stock y se guarda venta_id', async () => {
  const libro = await makeLibro(5, 10);
  const inventario = await Inventario.create({ libro_id: libro.id, bodega_id: fixtures.bodega.id, stock_minimo: 1 });
  fixtures.inventario = inventario;
  const movimiento = (data) => ({
    inventario_id: inventario.id,
    usuario_id: fixtures.usuario.id,
    ...data,
  });

  await MovimientoInventario.create(movimiento({ tipo_movimiento_id: tipoIngreso.id, cantidad: 5 }));

  const venta = await sequelize.transaction(async (transaction) => {
    const created = await Venta.create(ventaData(), { transaction });
    await VentaDetalle.create(
      { venta_id: created.id, libro_id: libro.id, cantidad: 2, precio_unitario: 10, subtotal: 20 },
      { transaction }
    );
    await MovimientoInventario.create(
      movimiento({ tipo_movimiento_id: tipoSalida.id, cantidad: 2, venta_id: created.id, motivo_detalle: `Venta V-${created.numero}` }),
      { transaction }
    );
    return created;
  });

  assert.equal((await Inventario.findByPk(inventario.id)).stock_actual, 3);
  const guardado = await MovimientoInventario.findOne({ where: { venta_id: venta.id }, include: [{ model: Venta, as: 'venta' }] });
  assert.equal(guardado.venta_id, venta.id);
  assert.equal(guardado.venta.numero, venta.numero);

  const sinVenta = await MovimientoInventario.create(movimiento({ tipo_movimiento_id: tipoSalida.id, cantidad: 1 }));
  assert.equal(sinVenta.venta_id, null);
  assert.equal((await Inventario.findByPk(inventario.id)).stock_actual, 2);
});

test('Los 13 modelos se inicializan y Venta carga sus asociaciones', async () => {
  assert.equal(Object.keys(sequelize.models).length, 13);
  assert.ok(sequelize.models.Venta && sequelize.models.VentaDetalle);

  const venta = await Venta.findOne({
    where: { bodega_id: fixtures.bodega.id },
    include: [
      { model: VentaDetalle, as: 'detalles' },
      { model: Usuario, as: 'vendedor' },
      { model: Bodega, as: 'bodega' },
      { model: Usuario, as: 'anulador' },
      { model: MovimientoInventario, as: 'movimientos' },
    ],
  });
  assert.ok(venta);
  assert.ok(Array.isArray(venta.detalles));
  assert.equal(venta.vendedor.id, fixtures.usuario.id);
  assert.equal(venta.bodega.id, fixtures.bodega.id);
  assert.equal(venta.anulador, null);
});

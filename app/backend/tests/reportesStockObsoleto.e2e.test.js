const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const appEnv = require('../src/config/env');
const { sequelize, Venta, VentaDetalle, MovimientoInventario, Inventario, Bodega, Sucursal } = require('../src/models');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const { crearEntorno } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');

const TEST_DATABASE = 'libreria_oskar_test';
let env;
let http;
const inventarios = [];
const libros = [];
let sucursalAlterna;
let bodegaAlterna;
let inventarioAlterno;

function haceDias(dias) { return new Date(Date.now() - dias * 86400000); }

async function ventaFixture(fixture, fecha, estado = 'Completada') {
  const anulada = estado === 'Anulada';
  const venta = await Venta.create({
    bodega_id: env.bodega.id,
    usuario_id: env.usuarios.Empleado.id,
    cliente_nombre: 'Fixture stock obsoleto',
    metodo_pago: 'Efectivo', subtotal: '10.00', descuento: '0.00', total: '10.00',
    estado,
    creado_en: fecha,
    ...(anulada ? { anulada_en: fecha, anulada_por: env.usuarios.Administrador.id, motivo_anulacion: 'Venta anulada de prueba' } : {}),
  });
  await VentaDetalle.create({ venta_id: venta.id, libro_id: fixture.libro.id, cantidad: 1, precio_unitario: '10.00', subtotal: '10.00' });
  return venta;
}

before(async () => {
  // Guardia local antes de crear fixtures: impide que una ejecución directa use la BD de desarrollo.
  if (process.env.NODE_ENV !== 'test' || appEnv.NODE_ENV !== 'test' || appEnv.db.database !== TEST_DATABASE || appEnv.db.connectionString) {
    throw new Error(`Pruebas de stock obsoleto bloqueadas: se requiere exclusivamente ${TEST_DATABASE}.`);
  }
  await sequelize.authenticate();
  const [rows] = await sequelize.query('SELECT current_database() AS db_name');
  if (rows[0]?.db_name !== TEST_DATABASE) throw new Error(`Base conectada inesperada: ${rows[0]?.db_name}`);

  env = await crearEntorno('stock-obsoleto');
  http = await levantarApi(env);
  const viejo = await env.crearLibro({ titulo: `Sin rotación ${env.tag}`, stock: 5 });
  const reciente = await env.crearLibro({ titulo: `Venta reciente ${env.tag}`, stock: 5 });
  const anulada = await env.crearLibro({ titulo: `Solo venta anulada ${env.tag}`, stock: 5 });
  const cero = await env.crearLibro({ titulo: `Stock agotado ${env.tag}`, stock: 0 });
  const inactivo = await env.crearLibro({ titulo: `Libro inactivo ${env.tag}`, stock: 5 });
  const nuevo = await env.crearLibro({ titulo: `Inventario recién registrado ${env.tag}`, stock: 2 });
  const ubicacionInactiva = await env.crearLibro({ titulo: `Bodega inactiva ${env.tag}`, stock: 3, bodegaId: env.bodegaInactiva.id });
  const fixtures = [viejo, reciente, anulada, cero, inactivo, nuevo, ubicacionInactiva];
  libros.push(...fixtures.map((f) => f.libro));
  inventarios.push(...fixtures.map((f) => f.inventario));

  const ingreso = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  for (const fixture of [viejo, reciente, anulada, inactivo, ubicacionInactiva]) {
    await fixture.inventario.update({ creado_en: haceDias(240) });
    await MovimientoInventario.update({ fecha_movimiento: haceDias(240) }, { where: { inventario_id: fixture.inventario.id, tipo_movimiento_id: ingreso.id } });
  }
  await ventaFixture(viejo, haceDias(220));
  await ventaFixture(reciente, haceDias(30));
  await ventaFixture(anulada, haceDias(10), 'Anulada');
  await inactivo.libro.update({ activo: false });

  sucursalAlterna = await Sucursal.create({ nombre: `Sucursal alterna ${env.tag}`, direccion: 'Fixture' });
  bodegaAlterna = await Bodega.create({ sucursal_id: sucursalAlterna.id, nombre: `Bodega alterna ${env.tag}` });
  inventarioAlterno = await Inventario.create({ libro_id: viejo.libro.id, bodega_id: bodegaAlterna.id, stock_actual: 0, stock_minimo: 1, creado_en: haceDias(240) });
  inventarios.push(inventarioAlterno);
  const ingresoAlterno = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  await movimientoRepository.createMovimiento({}, {
    inventarioId: inventarioAlterno.id, usuarioId: env.usuarios.Administrador.id,
    tipoMovimientoId: ingresoAlterno.id, cantidad: 4, motivoDetalle: 'Primera recepción en segunda sucursal',
  });
  await MovimientoInventario.update({ fecha_movimiento: haceDias(240) }, { where: { inventario_id: inventarioAlterno.id } });

  // Los movimientos no comerciales posteriores no deben reiniciar el reloj de ventas.
  const salida = await movimientoRepository.getTipoMovimientoByName('Salida');
  await movimientoRepository.createMovimiento({}, {
    inventarioId: viejo.inventario.id, usuarioId: env.usuarios.Administrador.id,
    tipoMovimientoId: salida.id, cantidad: 1, motivoDetalle: 'Movimiento administrativo reciente',
  });
});

after(async () => {
  try {
    if (http) await http.cerrar();
    if (inventarioAlterno) {
      await MovimientoInventario.destroy({ where: { inventario_id: inventarioAlterno.id } });
      await inventarioAlterno.destroy();
    }
    if (bodegaAlterna) await bodegaAlterna.destroy();
    if (sucursalAlterna) await sucursalAlterna.destroy();
    if (env) await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

test('Stock obsoleto requiere administrador y valida período, UUID y filtros', async () => {
  assert.equal((await http.api('GET', '/reportes/stock-obsoleto')).status, 401);
  assert.equal((await http.api('GET', '/reportes/stock-obsoleto', { token: http.tokens.empleado })).status, 403);
  assert.equal((await http.api('GET', '/reportes/stock-obsoleto', { token: http.tokens.usuario })).status, 403);
  for (const query of ['diasSinVenta=0', 'diasSinVenta=3651', 'categoriaId=x', 'libroActivo=desconocido', 'limit=201', 'q%5B%5D=x']) {
    assert.equal((await http.api('GET', `/reportes/stock-obsoleto?${query}`, { token: http.tokens.admin })).status, 400, query);
  }
});

test('Opciones y filtros de sucursal distinguen ubicaciones sin cruzar la rotación comercial', async () => {
  assert.equal((await http.api('GET', '/reportes/stock-obsoleto/opciones')).status, 401);
  assert.equal((await http.api('GET', '/reportes/stock-obsoleto/opciones', { token: http.tokens.empleado })).status, 403);
  const opciones = await http.api('GET', '/reportes/stock-obsoleto/opciones', { token: http.tokens.admin });
  assert.equal(opciones.status, 200);
  assert.ok(opciones.json.data.sucursales.some((sucursal) => sucursal.id === sucursalAlterna.id));
  const alternativa = await http.api('GET', `/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=todos&sucursalId=${sucursalAlterna.id}`, { token: http.tokens.admin });
  assert.deepEqual(alternativa.json.data.registros.map((row) => row.inventario_id), [inventarioAlterno.id]);
  const porIsbn = await http.api('GET', `/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=todos&q=${encodeURIComponent(libros[0].isbn)}`, { token: http.tokens.admin });
  assert.equal(porIsbn.json.data.total, 2);
  const umbralConfigurable = await http.api('GET', `/reportes/stock-obsoleto?diasSinVenta=29&libroActivo=todos&q=${encodeURIComponent(libros[1].titulo)}`, { token: http.tokens.admin });
  assert.equal(umbralConfigurable.json.data.total, 1);
});

test('Cuenta ventas completadas antiguas por bodega, omite ventas recientes, anuladas y stock cero', async () => {
  const response = await http.api('GET', '/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=todos&limit=50', { token: http.tokens.admin });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  const data = response.json.data;
  assert.equal(data.total, 4); // dos ubicaciones del antiguo, anulada (recepción) e inactivo al seleccionar todos
  assert.equal(data.registros.length, 4);
  assert.ok(data.registros.every((row) => row.existencias > 0));
  const ubicacionesAntiguas = data.registros.filter((row) => row.libro_id === libros[0].id);
  assert.equal(ubicacionesAntiguas.length, 2);
  assert.equal(ubicacionesAntiguas.filter((row) => row.ultima_venta).length, 1, 'la rotación de una bodega no debe contaminar la otra');
  assert.ok(data.registros.every((row) => row.dias_sin_rotacion >= 180));
  assert.ok(!data.registros.some((row) => [libros[1].id, libros[3].id, libros[5].id, libros[6].id].includes(row.libro_id)));
  const pagina1 = await http.api('GET', '/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=todos&limit=2&offset=0', { token: http.tokens.admin });
  const pagina2 = await http.api('GET', '/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=todos&limit=2&offset=2', { token: http.tokens.admin });
  assert.equal(pagina1.json.data.registros.length, 2);
  assert.equal(pagina2.json.data.registros.length, 2);
  assert.equal(new Set([...pagina1.json.data.registros, ...pagina2.json.data.registros].map((row) => row.inventario_id)).size, 4);

  const activos = await http.api('GET', '/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=activo', { token: http.tokens.admin });
  assert.equal(activos.json.data.total, 3);
  assert.ok(activos.json.data.registros.every((row) => row.libro_activo));
  const soloInactivos = await http.api('GET', '/reportes/stock-obsoleto?diasSinVenta=180&libroActivo=inactivo', { token: http.tokens.admin });
  assert.deepEqual(soloInactivos.json.data.registros.map((row) => row.libro_id), [libros[4].id]);
  const vacio = await http.api('GET', `/reportes/stock-obsoleto?diasSinVenta=3650&q=${encodeURIComponent('sin coincidencia')}`, { token: http.tokens.admin });
  assert.equal(vacio.json.data.total, 0);
});

test('Exportaciones PDF y Excel incluyen el inventario completo y los filtros seleccionados', async () => {
  for (const formato of ['xlsx', 'pdf']) {
    const response = await fetch(`${http.baseUrl}/reportes/stock-obsoleto/exportar?diasSinVenta=180&libroActivo=todos&formato=${formato}`, {
      headers: { Authorization: `Bearer ${http.tokens.admin}` },
    });
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (formato === 'pdf') assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-');
    else {
      assert.equal(buffer.subarray(0, 2).toString('ascii'), 'PK');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets.find((worksheet) => worksheet.name.startsWith('Inventario sin rotacion'));
      assert.ok(sheet);
      assert.match(String(sheet.getCell('A4').value), /diasSinVenta/);
      assert.equal(sheet.rowCount, 10); // título, metadatos, cabecera y cuatro filas completas
    }
  }
});

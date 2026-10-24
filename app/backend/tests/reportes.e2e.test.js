const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Categoria, Inventario, Libro, MovimientoInventario } = require('../src/models');
const movimientoRepository = require('../src/repositories/movimiento.repository');
const inventarioService = require('../src/services/inventario.service');
const { crearEntorno } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');

let env;
let http;
let categoria;
let libros = [];
let inventarios = [];

async function fijarFechaMovimiento(movimiento, fecha) {
  await sequelize.query('UPDATE movimientos_inventario SET fecha_movimiento = $1 WHERE id = $2', {
    bind: [fecha, movimiento.id],
  });
}

before(async () => {
  env = await crearEntorno('reportes');
  http = await levantarApi(env);
  categoria = await Categoria.create({ nombre: `Categoría reportes ${env.tag}` });
});

after(async () => {
  try {
    if (http) await http.cerrar();
    if (env) await env.limpiar();
    if (categoria) await categoria.destroy();
  } finally {
    await sequelize.close();
  }
});

test('Reportes administrativos requieren Administrador y validan filtros', async () => {
  for (const path of ['/reportes/inventario-valorizado', '/reportes/kardex']) {
    assert.equal((await http.api('GET', path)).status, 401);
    assert.equal((await http.api('GET', path, { token: http.tokens.empleado })).status, 403);
    assert.equal((await http.api('GET', path, { token: http.tokens.usuario })).status, 403);
    assert.equal((await http.api('GET', path, { token: http.tokens.admin })).status, 200);
  }
  for (const query of [
    'libroId=no-uuid', 'categoriaId[]=x', 'limit=0', 'limit=201', 'offset=-1',
  ]) {
    assert.equal((await http.api('GET', `/reportes/inventario-valorizado?${query}`, { token: http.tokens.admin })).status, 400, query);
  }
  for (const query of [
    'bodegaId=no-uuid', 'tipo=Desconocido', 'desde=2030-02-30',
    'desde=2031-01-02&hasta=2031-01-01', 'limit=x',
  ]) {
    assert.equal((await http.api('GET', `/reportes/kardex?${query}`, { token: http.tokens.admin })).status, 400, query);
  }
});

test('Inventario valorizado pagina sin duplicar, agrupa stocks y declara costo no disponible', async () => {
  const primero = await env.crearLibro({ titulo: `Reporte A ${env.tag}`, stock: 7 });
  const segundo = await env.crearLibro({ titulo: `Reporte B ${env.tag}`, stock: 4 });
  libros.push(primero.libro, segundo.libro);
  inventarios.push(primero.inventario, segundo.inventario);
  await Promise.all(libros.map((libro) => libro.update({ categoria_id: categoria.id })));
  await primero.libro.update({ activo: false });

  const otraBodega = await Inventario.create({ libro_id: primero.libro.id, bodega_id: env.bodegaInactiva.id, stock_actual: 0, stock_minimo: 1 });
  inventarios.push(otraBodega);
  const tipoIngreso = await movimientoRepository.getTipoMovimientoByName('Ingreso');
  await movimientoRepository.createMovimiento({}, {
    inventarioId: otraBodega.id,
    usuarioId: env.usuarios.Administrador.id,
    tipoMovimientoId: tipoIngreso.id,
    cantidad: 2,
    motivoDetalle: 'Fixture segunda bodega del reporte',
  });

  const response = await http.api('GET', `/reportes/inventario-valorizado?categoriaId=${categoria.id}&limit=2`, { token: http.tokens.admin });
  assert.equal(response.status, 200);
  const data = response.json.data;
  assert.deepEqual(data.filtros, { libroId: null, categoriaId: categoria.id, bodegaId: null });
  assert.equal(data.total, 3);
  assert.equal(data.limit, 2);
  assert.equal(data.registros.length, 2);
  assert.equal(new Set(data.registros.map((row) => row.inventario_id)).size, 2);
  assert.ok(data.registros.some((row) => row.libro_id === primero.libro.id && row.libro_activo === false));
  assert.ok(data.registros.every((row) => row.costo_unitario === null && row.valor_total === null));
  assert.equal(data.resumen.valoracion_disponible, false);
  assert.equal(data.resumen.existencias, 13);
  assert.equal(data.resumen.valor_total, null);
  assert.deepEqual(data.totales_por_categoria.map((row) => [row.categoria_id, row.existencias]), [[categoria.id, 13]]);
  assert.equal(data.totales_por_bodega.reduce((sum, row) => sum + row.existencias, 0), 13);

  const vacio = await http.api('GET', `/reportes/inventario-valorizado?categoriaId=${'00000000-0000-4000-8000-000000000099'}`, { token: http.tokens.admin });
  assert.equal(vacio.status, 200);
  assert.equal(vacio.json.data.total, 0);
  assert.equal(vacio.json.data.resumen.existencias, 0);
  assert.deepEqual(vacio.json.data.registros, []);
});

test('Reporte Kardex conserva filas del endpoint actual, filtra fechas/bodega/categoría y marca venta/anulación', async () => {
  const fixture = await env.crearLibro({ titulo: `Kardex reportes ${env.tag}`, stock: 8 });
  libros.push(fixture.libro); inventarios.push(fixture.inventario);
  await fixture.libro.update({ categoria_id: categoria.id });
  const ingreso = await MovimientoInventario.findOne({ where: { inventario_id: fixture.inventario.id } });
  await fijarFechaMovimiento(ingreso, '2032-05-10T12:00:00-06:00');

  const venta = await http.postVenta(http.cuerpo([{ libroId: fixture.libro.id, cantidad: 2 }]));
  assert.equal(venta.status, 201);
  const ventaId = venta.json.data.id;
  const salida = await MovimientoInventario.findOne({ where: { venta_id: ventaId } });
  await fijarFechaMovimiento(salida, '2032-05-11T12:00:00-06:00');
  const anulacion = await http.api('POST', `/ventas/${ventaId}/anular`, {
    token: http.tokens.admin, body: { motivo: 'Prueba Kardex reporte' },
  });
  assert.equal(anulacion.status, 200);
  const restitucion = await MovimientoInventario.findOne({ where: { venta_id: ventaId, id: { [require('sequelize').Op.ne]: salida.id } } });
  await fijarFechaMovimiento(restitucion, '2032-05-12T12:00:00-06:00');
  await inventarioService.registrarAjuste({
    inventarioId: fixture.inventario.id, stockNuevo: 6, motivo: 'Ajuste de prueba', usuarioId: env.usuarios.Administrador.id,
  });
  const ajuste = await MovimientoInventario.findOne({
    where: { inventario_id: fixture.inventario.id },
    include: [{ association: 'tipo_movimiento', where: { nombre: 'Ajuste' } }],
  });
  await fijarFechaMovimiento(ajuste, '2032-05-13T12:00:00-06:00');
  await fixture.libro.update({ activo: false });

  const query = `libroId=${fixture.libro.id}&categoriaId=${categoria.id}&bodegaId=${env.bodega.id}&desde=2032-05-10&hasta=2032-05-13&limit=20`;
  const reporte = await http.api('GET', `/reportes/kardex?${query}`, { token: http.tokens.admin });
  assert.equal(reporte.status, 200);
  const movimientos = reporte.json.data.movimientos;
  assert.equal(reporte.json.data.total, 4, JSON.stringify(reporte.json.data));
  assert.ok(movimientos.every((row) => row.titulo === fixture.libro.titulo), 'Incluye movimientos aunque el libro esté inactivo');
  assert.deepEqual(movimientos.map((row) => row.tipo), ['Ajuste', 'Ingreso', 'Salida', 'Ingreso']);
  assert.ok(movimientos.every((row) => row.venta_id === null || row.venta_id === ventaId));
  assert.ok(movimientos.every((row) => row.existencias_resultantes === null));
  assert.deepEqual(movimientos.map((row) => row.id), [ajuste.id, restitucion.id, salida.id, ingreso.id]);

  const existente = await http.api('GET', `/movimientos?libroId=${fixture.libro.id}&limit=20`, { token: http.tokens.empleado });
  assert.equal(existente.status, 200);
  assert.equal(Object.keys(existente.json.data).sort().join(','), 'limit,movimientos,offset,total');
  assert.deepEqual(movimientos.map((row) => row.id), existente.json.data.movimientos.map((row) => row.id));
  assert.equal((await http.api('GET', '/reportes/kardex?desde=2033-01-01&hasta=2033-01-02', { token: http.tokens.admin })).json.data.total, 0);
});

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../src/models');
const { crearEntorno } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');

const FECHA = '2035-03-10';
const FECHA_ANTERIOR = '2035-03-09';
const FECHA_FUERA = '2035-03-11';
let env;
let http;

async function fijarFechaVenta(id, fecha) {
  await sequelize.query('UPDATE ventas SET creado_en = $1 WHERE id = $2', {
    bind: [`${fecha}T16:00:00.000Z`, id],
  });
}

async function vender(libroId, cantidad, metodoPago, extra = {}) {
  const response = await http.postVenta(http.cuerpo([{ libroId, cantidad }], { metodoPago, ...extra }));
  assert.equal(response.status, 201, JSON.stringify(response.json));
  return response.json.data.id;
}

before(async () => {
  env = await crearEntorno('reportes-ventas');
  http = await levantarApi(env);
});

after(async () => {
  try {
    if (http) await http.cerrar();
    if (env) await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

test('Los cinco reportes nuevos requieren Administrador y validan parámetros', async () => {
  const paths = [
    `/reportes/corte-caja?fecha=${FECHA}`,
    `/reportes/resumen-periodo?desde=${FECHA}&hasta=${FECHA}`,
    '/reportes/libros-mas-vendidos', '/reportes/reposicion', '/reportes/ventas',
  ];
  for (const path of paths) {
    assert.equal((await http.api('GET', path)).status, 401, path);
    assert.equal((await http.api('GET', path, { token: http.tokens.empleado })).status, 403, path);
    assert.equal((await http.api('GET', path, { token: http.tokens.usuario })).status, 403, path);
    assert.equal((await http.api('GET', path, { token: http.tokens.admin })).status, 200, path);
  }
  const invalidas = [
    '/reportes/corte-caja?fecha=2035-02-30',
    '/reportes/resumen-periodo?desde=2035-03-11&hasta=2035-03-10',
    '/reportes/libros-mas-vendidos?limit=201',
    '/reportes/reposicion?bodegaId=x',
    '/reportes/ventas?metodoPago=Cheque',
  ];
  for (const path of invalidas) assert.equal((await http.api('GET', path, { token: http.tokens.admin })).status, 400, path);
});

test('Corte y resumen usan cabeceras sin duplicar detalles, separan anulaciones y comparan períodos exactos', async () => {
  const libroA = await env.crearLibro({ titulo: `Corte vigente ${env.tag}`, stock: 12 });
  const libroB = await env.crearLibro({ titulo: `Corte anulada ${env.tag}`, stock: 12 });
  const vigente = await vender(libroA.libro.id, 2, 'Efectivo', { descuento: '1.25' });
  const transferencia = await vender(libroA.libro.id, 1, 'Transferencia');
  const anulada = await vender(libroB.libro.id, 1, 'Transferencia');
  await Promise.all([vigente, transferencia, anulada].map((id) => fijarFechaVenta(id, FECHA)));
  const anulacion = await http.api('POST', `/ventas/${anulada}/anular`, {
    token: http.tokens.admin, body: { motivo: 'Anulación de prueba para reportes' },
  });
  assert.equal(anulacion.status, 200);

  const corte = await http.api('GET', `/reportes/corte-caja?fecha=${FECHA}`, { token: http.tokens.admin });
  assert.equal(corte.status, 200);
  assert.equal(corte.json.data.ventas.cantidad, 2);
  assert.equal(corte.json.data.ventas.bruto, '30.00');
  assert.equal(corte.json.data.ventas.descuentos, '1.25');
  assert.equal(corte.json.data.ventas.neto, '28.75');
  assert.deepEqual(corte.json.data.ventas_por_metodo_pago.map((p) => [p.metodo_pago, p.total]), [['Efectivo', '18.75'], ['Transferencia', '10.00']]);
  assert.equal(corte.json.data.totales_por_vendedor[0].total, '28.75');
  assert.equal(corte.json.data.anuladas.cantidad, 1);
  assert.equal(corte.json.data.anuladas.total_original, '10.00');
  assert.match(corte.json.data.tipo_corte, /no incluye apertura/);

  const previa = await vender(libroA.libro.id, 1, 'Efectivo');
  await fijarFechaVenta(previa, FECHA_ANTERIOR);
  const resumen = await http.api('GET', `/reportes/resumen-periodo?desde=${FECHA}&hasta=${FECHA}`, { token: http.tokens.admin });
  assert.equal(resumen.status, 200);
  assert.equal(resumen.json.data.periodo.cantidad_ventas, 2);
  assert.equal(resumen.json.data.periodo.neto, '28.75');
  assert.equal(resumen.json.data.periodo.anulaciones.cantidad, 1);
  assert.equal(resumen.json.data.comparacion.periodo.neto, '10.00');
  assert.equal(resumen.json.data.comparacion.desde, FECHA_ANTERIOR);

  const vacio = await http.api('GET', '/reportes/resumen-periodo?desde=2040-01-01&hasta=2040-01-02', { token: http.tokens.admin });
  assert.equal(vacio.json.data.periodo.cantidad_ventas, 0);
  assert.equal(vacio.json.data.periodo.neto, '0.00');
  assert.equal(vacio.json.data.comparacion.variacion_neto_porcentaje, '0.00');
});

test('Ranking y listado conservan ventas históricas, excluyen anuladas del ranking y paginan sin duplicar', async () => {
  const libro = await env.crearLibro({ titulo: `Ranking inactivo ${env.tag}`, stock: 10 });
  const vigenteA = await vender(libro.libro.id, 2, 'Efectivo');
  const vigenteB = await vender(libro.libro.id, 1, 'Transferencia');
  const anulada = await vender(libro.libro.id, 3, 'Efectivo');
  for (const id of [vigenteA, vigenteB, anulada]) await fijarFechaVenta(id, FECHA_FUERA);
  await http.api('POST', `/ventas/${anulada}/anular`, { token: http.tokens.admin, body: { motivo: 'Anulada para excluir del ranking' } });
  await libro.libro.update({ activo: false });

  const ranking = await http.api('GET', `/reportes/libros-mas-vendidos?desde=${FECHA_FUERA}&hasta=${FECHA_FUERA}`, { token: http.tokens.admin });
  assert.equal(ranking.status, 200);
  const fila = ranking.json.data.libros.find((r) => r.libro_id === libro.libro.id);
  assert.equal(fila.unidades_vendidas, 3);
  assert.equal(fila.ingresos_brutos, '30.00');
  assert.equal(fila.posicion, 1);

  const ventas = await http.api('GET', `/reportes/ventas?desde=${FECHA_FUERA}&hasta=${FECHA_FUERA}&limit=2&offset=0`, { token: http.tokens.admin });
  assert.equal(ventas.status, 200);
  assert.equal(ventas.json.data.total, 3);
  assert.equal(ventas.json.data.ventas.length, 2);
  assert.equal(ventas.json.data.ventas.filter((r) => r.estado === 'Anulada').length, 1);
  assert.ok(ventas.json.data.ventas.every((r) => r.anulada_en !== undefined));
  const segunda = await http.api('GET', `/reportes/ventas?desde=${FECHA_FUERA}&hasta=${FECHA_FUERA}&limit=2&offset=2`, { token: http.tokens.admin });
  assert.equal(segunda.json.data.ventas.length, 1);
  assert.equal(new Set([...ventas.json.data.ventas, ...segunda.json.data.ventas].map((r) => r.id)).size, 3);
});

test('Reposición desglosa bodega, calcula ventas completadas por período y no sugiere inactivos', async () => {
  const activo = await env.crearLibro({ titulo: `Bajo mínimo ${env.tag}`, stock: 2 });
  const inactivo = await env.crearLibro({ titulo: `Inactivo con stock ${env.tag}`, stock: 1 });
  await activo.inventario.update({ stock_minimo: 3 });
  await inactivo.inventario.update({ stock_minimo: 2 });
  await inactivo.libro.update({ activo: false });
  const vendido = await vender(activo.libro.id, 1, 'Efectivo');
  await fijarFechaVenta(vendido, FECHA);

  const response = await http.api('GET', `/reportes/reposicion?desde=${FECHA}&hasta=${FECHA}&limit=200`, { token: http.tokens.admin });
  assert.equal(response.status, 200);
  const activoRow = response.json.data.registros.find((r) => r.libro_id === activo.libro.id && r.bodega_id === env.bodega.id);
  const inactivoRow = response.json.data.registros.find((r) => r.libro_id === inactivo.libro.id && r.bodega_id === env.bodega.id);
  assert.equal(activoRow.necesita_reposicion, true);
  assert.equal(activoRow.cantidad_sugerida, null);
  assert.equal(activoRow.unidades_vendidas_periodo, 1);
  assert.equal(inactivoRow.libro_activo, false);
  assert.equal(inactivoRow.necesita_reposicion, false);
  assert.equal(inactivoRow.cantidad_sugerida, null);

  const otraBodega = await env.crearLibro({ titulo: `Otra bodega reposición ${env.tag}`, stock: 1, bodegaId: env.bodegaInactiva.id });
  await otraBodega.inventario.update({ stock_minimo: 2 });
  const doble = await http.api('GET', `/reportes/reposicion?bodegaId=${env.bodegaInactiva.id}`, { token: http.tokens.admin });
  assert.ok(doble.json.data.registros.some((r) => r.bodega_id === env.bodegaInactiva.id && r.libro_id === otraBodega.libro.id));
  assert.ok(response.json.data.registros.every((r) => r.existencias >= 0 && r.stock_minimo >= 0));
});

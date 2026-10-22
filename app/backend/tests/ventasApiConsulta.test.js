const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Venta, MovimientoInventario } = require('../src/models');
const { crearEntorno } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');

let env;
let http;
let api;
let tokens;
let cuerpo;
let postVenta;

before(async () => {
  env = await crearEntorno('vcon2');
  http = await levantarApi(env);
  ({ api, tokens, cuerpo, postVenta } = http);
});

after(async () => {
  try {
    await http.cerrar();
    await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

// -------------------- f) Listar y detalle

// La BD no deja fijar creado_en desde el modelo (timestamps); la prueba lo ajusta con SQL.
async function fecharVenta(id, iso) {
  await sequelize.query('UPDATE ventas SET creado_en = $1 WHERE id = $2', { bind: [iso, id] });
}

test('f) GET /ventas y /ventas/:id: autenticación y roles', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 3 });
  const { json } = await postVenta(cuerpo([{ libroId: a.libro.id, cantidad: 1 }]));
  const id = json.data.id;

  for (const ruta of ['/ventas', `/ventas/${id}`]) {
    assert.equal((await api('GET', ruta)).status, 401, ruta);
    assert.equal((await api('GET', ruta, { token: tokens.usuario })).status, 403, ruta);
    assert.equal((await api('GET', ruta, { token: tokens.empleado })).status, 200, ruta);
    assert.equal((await api('GET', ruta, { token: tokens.admin })).status, 200, ruta);
  }

  const detalle = await api('GET', `/ventas/${id}`, { token: tokens.empleado });
  assert.deepEqual(detalle.json.data, json.data);
  assert.equal((await api('GET', '/ventas/5a215402-f1fb-45a2-b20c-a5816e0445a0', { token: tokens.admin })).status, 404);
  assert.equal((await api('GET', '/ventas/no-es-uuid', { token: tokens.admin })).status, 400);
});

test('f) GET /ventas: filtros por estado y fechas (hora de Guatemala), paginación y agregados', async () => {
  const a = await env.crearLibro({ precio: '10.00', stock: 50 });
  const b = await env.crearLibro({ precio: '3.00', stock: 50 });
  const crear = async (items) => (await postVenta(cuerpo(items))).json.data;

  const dosLineas = await crear([{ libroId: a.libro.id, cantidad: 2 }, { libroId: b.libro.id, cantidad: 3 }]);
  const noche = await crear([{ libroId: a.libro.id, cantidad: 1 }]);
  const mediodia = await crear([{ libroId: a.libro.id, cantidad: 1 }]);
  const inicioDia = await crear([{ libroId: a.libro.id, cantidad: 1 }]);
  const finAnterior = await crear([{ libroId: a.libro.id, cantidad: 1 }]);
  const madrugadaSiguiente = await crear([{ libroId: a.libro.id, cantidad: 1 }]);

  // Días de 2031 para no mezclarse con otros datos. Guatemala = UTC-6, sin horario de verano.
  await fecharVenta(noche.id, '2031-03-14T23:30:00-06:00'); // 05:30Z del día 15: cae el 14 en Guatemala
  await fecharVenta(mediodia.id, '2031-03-14T12:00:00-06:00');
  await fecharVenta(inicioDia.id, '2031-03-14T00:00:00-06:00'); // borde inferior incluido
  await fecharVenta(finAnterior.id, '2031-03-13T23:59:59-06:00'); // día anterior
  await fecharVenta(madrugadaSiguiente.id, '2031-03-15T00:00:00-06:00'); // borde superior excluido
  await fecharVenta(dosLineas.id, '2031-03-14T08:00:00-06:00');
  await api('POST', `/ventas/${mediodia.id}/anular`, { token: tokens.admin, body: { motivo: 'prueba de filtro' } });

  const ids = async (query) => (await api('GET', `/ventas?${query}`, { token: tokens.empleado }))
    .json.data.ventas.map((v) => v.id);

  const dia14 = await ids('desde=2031-03-14&hasta=2031-03-14&limit=200');
  assert.deepEqual(new Set(dia14), new Set([noche.id, mediodia.id, inicioDia.id, dosLineas.id]));
  assert.ok(dia14.includes(noche.id), 'la venta de las 23:30 de Guatemala cae en su día');
  assert.deepEqual(await ids('desde=2031-03-15&hasta=2031-03-15'), [madrugadaSiguiente.id]);
  assert.deepEqual(await ids('desde=2031-03-13&hasta=2031-03-13'), [finAnterior.id]);
  assert.equal((await ids('desde=2031-03-13&hasta=2031-03-15')).length, 6);
  assert.deepEqual(await ids('desde=2031-03-14&hasta=2031-03-14&estado=Anulada'), [mediodia.id]);
  const completadas = await ids('desde=2031-03-14&hasta=2031-03-14&estado=Completada&limit=200');
  assert.equal(completadas.length, 3);
  assert.ok(!completadas.includes(mediodia.id));

  // Orden por fecha descendente y paginación
  const rango = '/ventas?desde=2031-03-13&hasta=2031-03-15';
  const completo = (await api('GET', `${rango}&limit=200`, { token: tokens.admin })).json.data;
  assert.equal(completo.total, 6);
  assert.deepEqual(completo.ventas.map((v) => v.id), [
    madrugadaSiguiente.id, noche.id, mediodia.id, dosLineas.id, inicioDia.id, finAnterior.id,
  ]);
  const pagina = (await api('GET', `${rango}&limit=2&offset=1`, { token: tokens.admin })).json.data;
  assert.equal(pagina.total, 6);
  assert.equal(pagina.limit, 2);
  assert.equal(pagina.offset, 1);
  assert.deepEqual(pagina.ventas.map((v) => v.id), [noche.id, mediodia.id]);
  const porDefecto = (await api('GET', rango, { token: tokens.admin })).json.data;
  assert.equal(porDefecto.limit, 50);
  assert.equal(porDefecto.offset, 0);

  // Forma del ítem y agregados
  const item = completo.ventas.find((v) => v.id === dosLineas.id);
  assert.deepEqual(Object.keys(item).sort(), [
    'bodega_nombre', 'cliente_nombre', 'codigo', 'descuento', 'estado', 'fecha', 'id', 'lineas',
    'metodo_pago', 'numero', 'subtotal', 'total', 'unidades', 'vendedor_nombre',
  ]);
  assert.equal(item.lineas, 2);
  assert.equal(item.unidades, 5);
  assert.equal(item.subtotal, '29.00');
  assert.equal(item.total, '29.00');
  assert.equal(item.bodega_nombre, env.bodega.nombre);
  assert.equal(item.vendedor_nombre, env.usuarios.Empleado.nombre_completo);
  assert.equal(item.codigo, dosLineas.codigo);
  assert.equal(new Date(item.fecha).toISOString(), '2031-03-14T14:00:00.000Z');
});

test('f) GET /ventas con parámetros inválidos → 400', async () => {
  const malos = [
    'estado=Pendiente', 'estado[]=Anulada', 'limit=0', 'limit=201', 'limit=abc', 'limit=1.5', 'limit=-1',
    'limit=1&limit=2', 'offset=-1', 'offset=x', 'offset=99999999999999999999',
    'desde=2026-02-30', 'hasta=2026-13-01', 'desde=14/03/2026', 'desde=hoy',
    'desde=2026-03-15&hasta=2026-03-14', 'desde[a]=1',
  ];
  for (const query of malos) {
    const res = await api('GET', `/ventas?${query}`, { token: tokens.admin });
    assert.equal(res.status, 400, `${query}: ${JSON.stringify(res.json)}`);
  }
});

// -------------------- g) Compatibilidad

test('g) GET /movimientos conserva su contrato con movimientos de ventas', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 4 });
  const { json } = await postVenta(cuerpo([{ libroId: a.libro.id, cantidad: 2 }]));
  await api('POST', `/ventas/${json.data.id}/anular`, { token: tokens.admin, body: { motivo: 'compat' } });

  const res = await api('GET', `/movimientos?libroId=${a.libro.id}`, { token: tokens.empleado });
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.json.data).sort(), ['limit', 'movimientos', 'offset', 'total']);
  assert.equal(res.json.data.total, 3); // Ingreso inicial + Salida de venta + Ingreso de anulación
  const venta = res.json.data.movimientos.find((m) => m.motivo_detalle === `Venta ${json.data.codigo}`);
  assert.ok(venta);
  assert.equal(venta.tipo, 'Salida');
  assert.equal(venta.titulo, a.libro.titulo);
  assert.deepEqual(Object.keys(venta).sort(), [
    'bodega_nombre', 'cantidad', 'fecha_movimiento', 'id', 'isbn', 'libro_id', 'motivo_detalle',
    'sucursal_nombre', 'tipo', 'titulo', 'usuario_nombre',
  ]);
  const salidas = await api('GET', `/movimientos?libroId=${a.libro.id}&tipo=Salida`, { token: tokens.empleado });
  assert.equal(salidas.json.data.total, 1);
});

test('g) Las salidas y ajustes manuales siguen funcionando sin venta asociada', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 5 });
  const salida = await api('POST', `/inventario/${a.inventario.id}/salida`, {
    token: tokens.empleado, body: { cantidad: 2, motivo: 'Salida manual' },
  });
  assert.equal(salida.status, 201);
  const ajuste = await api('POST', `/inventario/${a.inventario.id}/ajuste`, {
    token: tokens.empleado, body: { stockNuevo: 9, motivo: 'Conteo' },
  });
  assert.equal(ajuste.status, 201);
  assert.equal(await env.stockDe(a.inventario), 9);
  assert.equal(await MovimientoInventario.count({ where: { inventario_id: a.inventario.id, venta_id: null } }), 3);
});

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
  env = await crearEntorno('vapi');
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

// -------------------- a) Crear

test('a) POST /ventas (Empleado): 201, importes en centavos, precio de BD y actor = token', async () => {
  const a = await env.crearLibro({ precio: '85.50', stock: 10 });
  const b = await env.crearLibro({ precio: '19.99', stock: 5 });
  const res = await postVenta(cuerpo(
    [{ libroId: a.libro.id, cantidad: 2 }, { libroId: b.libro.id, cantidad: 3 }],
    {
      descuento: 10.5,
      // Todo esto debe ignorarse
      usuarioId: env.usuarios.Administrador.id, precio: 1, subtotal: 1, total: 1,
    }
  ));
  assert.equal(res.status, 201);
  assert.equal(res.json.status, 'success');
  const venta = res.json.data;
  assert.equal(venta.subtotal, '230.97');
  assert.equal(venta.descuento, '10.50');
  assert.equal(venta.total, '220.47');
  assert.match(venta.codigo, /^V-\d{6,}$/);
  assert.equal(venta.vendedor.id, env.usuarios.Empleado.id);
  assert.equal(venta.cliente_nombre, 'Consumidor final');
  assert.deepEqual(Object.keys(venta).sort(), [
    'anulada_en', 'anulada_por', 'bodega', 'cliente_nit', 'cliente_nombre', 'codigo', 'descuento',
    'detalles', 'estado', 'fecha', 'id', 'metodo_pago', 'motivo_anulacion', 'notas', 'numero',
    'subtotal', 'total', 'vendedor',
  ]);
  assert.equal(venta.detalles.find((d) => d.libro_id === a.libro.id).precio_unitario, '85.50');
  assert.equal(await env.stockDe(a.inventario), 8);
  assert.equal(await env.stockDe(b.inventario), 2);

  const movs = await MovimientoInventario.findAll({ where: { venta_id: venta.id } });
  assert.equal(movs.length, 2);
  assert.ok(movs.every((m) => m.usuario_id === env.usuarios.Empleado.id));
  assert.ok(movs.every((m) => m.motivo_detalle === `Venta ${venta.codigo}`));
});

test('a) POST /ventas exige autenticación y rol Administrador o Empleado', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 2 });
  const body = cuerpo([{ libroId: a.libro.id, cantidad: 1 }]);
  assert.equal((await api('POST', '/ventas', { body })).status, 401);
  assert.equal((await postVenta(body, tokens.usuario)).status, 403);
  assert.equal(await env.stockDe(a.inventario), 2);
  assert.equal((await postVenta(body, tokens.admin)).status, 201);
});

// -------------------- b) Rechazos

test('b) POST /ventas con datos inválidos → 400 sin persistir nada', async () => {
  const a = await env.crearLibro({ precio: '10.00', stock: 5 });
  const item = { libroId: a.libro.id, cantidad: 1 };
  const antes = await env.conteos();
  const casos = {
    'items vacío': cuerpo([]),
    'items no es arreglo': cuerpo('x'),
    'items nulo': { ...cuerpo([item]), items: null },
    'más de 50 ítems': cuerpo(Array.from({ length: 51 }, () => item)),
    'libro repetido': cuerpo([item, { ...item, cantidad: 2 }]),
    'libro repetido (mayúsculas)': cuerpo([item, { libroId: a.libro.id.toUpperCase(), cantidad: 1 }]),
    'ítem no es objeto': cuerpo([7]),
    'libroId no UUID': cuerpo([{ libroId: 'abc', cantidad: 1 }]),
    'libroId arreglo': cuerpo([{ libroId: [a.libro.id], cantidad: 1 }]),
    'cantidad 0': cuerpo([{ ...item, cantidad: 0 }]),
    'cantidad decimal': cuerpo([{ ...item, cantidad: 1.5 }]),
    'cantidad texto': cuerpo([{ ...item, cantidad: 'dos' }]),
    'cantidad numérica en texto': cuerpo([{ ...item, cantidad: '2' }]),
    'cantidad mayor que INT': cuerpo([{ ...item, cantidad: 2147483648 }]),
    'cantidad negativa': cuerpo([{ ...item, cantidad: -1 }]),
    'metodoPago inválido': cuerpo([item], { metodoPago: 'Tarjeta' }),
    'metodoPago ausente': { bodegaId: env.bodega.id, items: [item] },
    'metodoPago en minúsculas': cuerpo([item], { metodoPago: 'efectivo' }),
    'bodegaId inválido': cuerpo([item], { bodegaId: 'x' }),
    'bodegaId objeto': cuerpo([item], { bodegaId: { a: 1 } }),
    'descuento con 3 decimales': cuerpo([item], { descuento: 1.234 }),
    'descuento negativo': cuerpo([item], { descuento: -1 }),
    'descuento texto': cuerpo([item], { descuento: 'mucho' }),
    'descuento objeto': cuerpo([item], { descuento: {} }),
    'descuento mayor que el subtotal': cuerpo([item], { descuento: '10.01' }),
    'clienteNombre arreglo': cuerpo([item], { clienteNombre: ['x'] }),
    'clienteNombre muy largo': cuerpo([item], { clienteNombre: 'x'.repeat(151) }),
    'clienteNit muy largo': cuerpo([item], { clienteNit: '1'.repeat(21) }),
    'notas muy largas': cuerpo([item], { notas: 'n'.repeat(1001) }),
  };
  for (const [nombre, body] of Object.entries(casos)) {
    const res = await postVenta(body);
    assert.equal(res.status, 400, `${nombre}: ${JSON.stringify(res.json)}`);
    assert.equal(res.json.status, 'fail', nombre);
  }
  const arreglo = await postVenta([item]);
  assert.equal(arreglo.status, 400);
  assert.deepEqual(await env.conteos(), antes);
});

test('b) Errores de negocio vía HTTP: 409 stock/precio, 404 libro/bodega, 400 desborde', async () => {
  const escaso = await env.crearLibro({ titulo: 'Escaso API', precio: 10, stock: 1 });
  const gratis = await env.crearLibro({ titulo: 'Gratis API', precio: 0, stock: 5 });
  const caro = await env.crearLibro({ precio: '99999999.99', stock: 5 });
  const fantasma = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
  const antes = await env.conteos();

  const stock = await postVenta(cuerpo([{ libroId: escaso.libro.id, cantidad: 3 }]));
  assert.equal(stock.status, 409);
  assert.equal(stock.json.message, 'Stock insuficiente: «Escaso API» (disponible 1, solicitado 3)');

  const precio = await postVenta(cuerpo([{ libroId: gratis.libro.id, cantidad: 1 }]));
  assert.equal(precio.status, 409);
  assert.match(precio.json.message, /«Gratis API»/);

  assert.equal((await postVenta(cuerpo([{ libroId: fantasma, cantidad: 1 }]))).status, 404);
  assert.equal((await postVenta(cuerpo([{ libroId: escaso.libro.id, cantidad: 1 }], { bodegaId: fantasma }))).status, 404);
  assert.equal(
    (await postVenta(cuerpo([{ libroId: escaso.libro.id, cantidad: 1 }], { bodegaId: env.bodegaInactiva.id }))).status, 404
  );

  const desborde = await postVenta(cuerpo([{ libroId: caro.libro.id, cantidad: 2 }]));
  assert.equal(desborde.status, 400);
  assert.deepEqual(await env.conteos(), antes);
});

// -------------------- e) Anular

test('e) POST /ventas/:id/anular: permisos y validaciones', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 4 });
  const { json } = await postVenta(cuerpo([{ libroId: a.libro.id, cantidad: 2 }]));
  const id = json.data.id;
  const ruta = `/ventas/${id}/anular`;

  assert.equal((await api('POST', ruta, { body: { motivo: 'x' } })).status, 401);
  assert.equal((await api('POST', ruta, { token: tokens.empleado, body: { motivo: 'x' } })).status, 403);
  assert.equal((await api('POST', ruta, { token: tokens.usuario, body: { motivo: 'x' } })).status, 403);
  assert.equal((await api('POST', '/ventas/no-uuid/anular', { token: tokens.admin, body: { motivo: 'x' } })).status, 400);
  assert.equal((await api('POST', ruta, { token: tokens.admin, body: {} })).status, 400);
  assert.equal((await api('POST', ruta, { token: tokens.admin, body: { motivo: '   ' } })).status, 400);
  assert.equal((await api('POST', ruta, { token: tokens.admin, body: { motivo: ['x'] } })).status, 400);
  assert.equal((await api('POST', ruta, { token: tokens.admin, body: { motivo: 'x'.repeat(501) } })).status, 400);
  assert.equal((await api('POST', '/ventas/5a215402-f1fb-45a2-b20c-a5816e0445a0/anular',
    { token: tokens.admin, body: { motivo: 'x' } })).status, 404);
  assert.equal(await env.stockDe(a.inventario), 2);
  assert.equal((await Venta.findByPk(id)).estado, 'Completada');
});

test('e) Administrador anula: 200, datos de anulación, Ingreso con venta_id y stock restituido; 2ª vez 409', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 7 });
  const { json } = await postVenta(cuerpo([{ libroId: a.libro.id, cantidad: 5 }]));
  const venta = json.data;
  assert.equal(await env.stockDe(a.inventario), 2);

  const res = await api('POST', `/ventas/${venta.id}/anular`, { token: tokens.admin, body: { motivo: 'Devolución total' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'success');
  const anulada = res.json.data;
  assert.equal(anulada.estado, 'Anulada');
  assert.equal(anulada.anulada_por.id, env.usuarios.Administrador.id);
  assert.ok(anulada.anulada_en);
  assert.equal(anulada.motivo_anulacion, 'Devolución total');
  assert.equal(await env.stockDe(a.inventario), 7);

  const ingreso = await MovimientoInventario.findOne({
    where: { venta_id: venta.id, motivo_detalle: `Anulación de venta ${venta.codigo}: Devolución total` },
  });
  assert.ok(ingreso);
  assert.equal(ingreso.cantidad, 5);
  assert.equal(ingreso.usuario_id, env.usuarios.Administrador.id);

  const otra = await api('POST', `/ventas/${venta.id}/anular`, { token: tokens.admin, body: { motivo: 'otra vez' } });
  assert.equal(otra.status, 409);
  assert.equal(await env.stockDe(a.inventario), 7);
});

test('e) Dos anulaciones simultáneas por HTTP: una 200, la otra 409, stock restituido una vez', async () => {
  const a = await env.crearLibro({ precio: 10, stock: 5 });
  const { json } = await postVenta(cuerpo([{ libroId: a.libro.id, cantidad: 4 }]));
  const resultados = await Promise.all([1, 2].map((n) =>
    api('POST', `/ventas/${json.data.id}/anular`, { token: tokens.admin, body: { motivo: `Intento ${n}` } })));
  assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await env.stockDe(a.inventario), 5);
});


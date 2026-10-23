const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../src/models');
const {
  crearFabrica, levantarServidor, tokenSesion, tokenTemporal, codigoTotp, codigoErroneo, olvidarPaso,
  conObligatorio, activarDirecto, estadoBd,
} = require('./helpers/dosFactores');

const FORMATO_RESPALDO = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;
let fabrica;
let srv;
let empleado;
let admin;
// Estado compartido (las pruebas de este archivo corren en orden).
const ctx = {};

before(async () => {
  fabrica = crearFabrica('2fa-gestion');
  empleado = await fabrica.crear('Empleado');
  admin = await fabrica.crear('Administrador');
  srv = await levantarServidor();
  Object.assign(ctx, await activarDirecto(empleado));
  ctx.sesion = tokenSesion(empleado);
  ctx.verify = tokenTemporal(empleado, '2fa-verify');
});

after(async () => {
  try {
    await srv.cerrar();
    await fabrica.limpiar();
  } finally {
    await sequelize.close();
  }
});

const post = (ruta, token, body) => srv.api('POST', ruta, { token, body });
const estado = (token = ctx.sesion) => srv.api('GET', '/auth/2fa/estado', { token });

test('estado: informa activo, obligatorio y códigos restantes', async () => {
  const res = await estado();
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, { activo: true, obligatorio: false, codigosRespaldoRestantes: 10 });

  assert.equal((await post('/auth/2fa/verificar', ctx.verify, { codigoRespaldo: ctx.codigosRespaldo[0] })).status, 200);
  assert.equal((await estado()).json.data.codigosRespaldoRestantes, 9);

  await conObligatorio(async () => {
    assert.equal((await estado()).json.data.obligatorio, true);
  });
  const sinAlta = await estado(tokenSesion(admin));
  assert.deepEqual(sinAlta.json.data, { activo: false, obligatorio: false, codigosRespaldoRestantes: 0 });
  assert.equal((await srv.api('GET', '/auth/2fa/estado')).status, 401);
});

test('regenerar: código erróneo → 400, sin 2FA activo → 409; con código válido invalida los anteriores', async () => {
  const malo = await post('/auth/2fa/respaldo/regenerar', ctx.sesion, { codigo: codigoErroneo(ctx.secreto) });
  assert.equal(malo.status, 400);
  assert.equal(malo.json.message, 'Código inválido o vencido.');
  assert.equal((await post('/auth/2fa/respaldo/regenerar', ctx.sesion, { codigo: '12' })).status, 400);
  assert.equal((await post('/auth/2fa/respaldo/regenerar', tokenSesion(admin), { codigo: '123456' })).status, 409);
  assert.equal((await post('/auth/2fa/respaldo/regenerar', undefined, { codigo: '123456' })).status, 401);

  await olvidarPaso(empleado.id);
  const res = await post('/auth/2fa/respaldo/regenerar', ctx.sesion, { codigo: codigoTotp(ctx.secreto) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const nuevos = res.json.data.codigosRespaldo;
  assert.equal(nuevos.length, 10);
  nuevos.forEach((c) => assert.match(c, FORMATO_RESPALDO));

  const viejo = await post('/auth/2fa/verificar', ctx.verify, { codigoRespaldo: ctx.codigosRespaldo[1] });
  assert.equal(viejo.status, 401);
  assert.equal((await estado()).json.data.codigosRespaldoRestantes, 10);
  assert.equal((await post('/auth/2fa/verificar', ctx.verify, { codigoRespaldo: nuevos[0] })).status, 200);
  ctx.codigosRespaldo = nuevos;
});

test('exposición: /auth/me, /usuarios, login y estado no exponen secreto, hash ni códigos', async () => {
  const fila = await estadoBd(empleado.id);
  const sensibles = [
    ctx.secreto, fila.dos_factores_secreto,
    ...ctx.codigosRespaldo, ...ctx.codigosRespaldo.map((c) => c.replace('-', '')),
  ];
  const revisar = (res) => {
    const texto = JSON.stringify(res.json);
    sensibles.forEach((s, i) => assert.ok(!texto.includes(s), `valor sensible #${i} expuesto`));
    assert.ok(!/"(dos_factores_secreto|codigo_hash|codigosRespaldo|password_hash)"/.test(texto));
  };

  const me = await srv.api('GET', '/auth/me', { token: ctx.sesion });
  assert.deepEqual(Object.keys(me.json.data).sort(), ['email', 'id', 'nombre_completo', 'rol']);
  revisar(me);
  const usuarios = await srv.api('GET', '/usuarios', { token: tokenSesion(admin) });
  assert.equal(usuarios.status, 200);
  assert.ok(usuarios.json.data.some((u) => u.id === empleado.id));
  revisar(usuarios);
  revisar(await srv.login(empleado.email));
  revisar(await estado());
});

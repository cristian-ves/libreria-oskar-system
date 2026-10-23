const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../src/models');
const {
  crearFabrica, levantarServidor, codigoTotp, codigoErroneo, olvidarPaso,
  conObligatorio, estadoBd, respaldosBd,
} = require('./helpers/dosFactores');

const FORMATO_RESPALDO = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;
let fabrica;
let srv;
let empleado;
// Estado compartido del flujo (las pruebas de este archivo corren en orden).
const flujo = {};

before(async () => {
  fabrica = crearFabrica('2fa-alta');
  empleado = await fabrica.crear('Empleado');
  srv = await levantarServidor();
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

test('alta 1: login obligatorio → configurar devuelve QR PNG, clave y otpauth, y guarda el secreto cifrado', async () => {
  await conObligatorio(async () => {
    const login = await srv.login(empleado.email);
    assert.equal(login.json.data.paso, 'configurar');
    flujo.setup = login.json.data.tokenTemporal;
  });

  const res = await post('/auth/2fa/configurar', flujo.setup);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const { qrDataUrl, secretoManual, otpauthUrl } = res.json.data;
  assert.ok(qrDataUrl.startsWith('data:image/png;base64,'));
  assert.match(secretoManual, /^[A-Z2-7]{32}$/);
  assert.ok(otpauthUrl.startsWith('otpauth://totp/'));
  assert.ok(otpauthUrl.includes(`secret=${secretoManual}`));
  assert.ok(otpauthUrl.includes('issuer=Librer%C3%ADa%20Oskar'));

  const fila = await estadoBd(empleado.id);
  assert.equal(fila.dos_factores_activo, false);
  assert.ok(fila.dos_factores_secreto.startsWith('v1:'));
  assert.ok(!fila.dos_factores_secreto.includes(secretoManual));

  // Repetir configurar reemplaza el secreto pendiente.
  const otra = await post('/auth/2fa/configurar', flujo.setup);
  assert.equal(otra.status, 200);
  assert.notEqual(otra.json.data.secretoManual, secretoManual);
  flujo.secreto = otra.json.data.secretoManual;
});

test('alta 2: activar con formato inválido → 400 y con código erróneo → 401 (el fallo queda registrado)', async () => {
  assert.equal((await post('/auth/2fa/activar', flujo.setup, { codigo: '12ab' })).status, 400);
  assert.equal((await post('/auth/2fa/activar', flujo.setup, {})).status, 400);

  const res = await post('/auth/2fa/activar', flujo.setup, { codigo: codigoErroneo(flujo.secreto) });
  assert.equal(res.status, 401);
  assert.equal(res.json.message, 'Código inválido o vencido.');
  const fila = await estadoBd(empleado.id);
  assert.equal(fila.dos_factores_intentos, 1);
  assert.equal(fila.dos_factores_activo, false);
});

test('alta 3: activar con el código correcto entrega sesión y 10 códigos de respaldo una sola vez', async () => {
  const res = await post('/auth/2fa/activar', flujo.setup, { codigo: codigoTotp(flujo.secreto) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const { token, usuario, codigosRespaldo } = res.json.data;
  assert.equal(usuario.id, empleado.id);
  assert.equal(codigosRespaldo.length, 10);
  assert.equal(new Set(codigosRespaldo).size, 10);
  codigosRespaldo.forEach((c) => assert.match(c, FORMATO_RESPALDO));
  flujo.codigos = codigosRespaldo;

  const me = await srv.api('GET', '/auth/me', { token });
  assert.equal(me.status, 200);

  const fila = await estadoBd(empleado.id);
  assert.equal(fila.dos_factores_activo, true);
  assert.equal(fila.dos_factores_intentos, 0);
  const guardados = await respaldosBd(empleado.id);
  assert.equal(guardados.length, 10);
  guardados.forEach((g) => {
    assert.match(g.codigo_hash, /^[0-9a-f]{64}$/);
    assert.ok(!codigosRespaldo.some((c) => g.codigo_hash.includes(c.replace('-', ''))));
  });

  assert.equal((await post('/auth/2fa/configurar', flujo.setup)).status, 409);
  assert.equal((await post('/auth/2fa/activar', flujo.setup, { codigo: codigoTotp(flujo.secreto) })).status, 409);
});

test('alta 4: nuevo login pide verificar; el TOTP funciona una sola vez y su token abre /auth/me', async () => {
  const login = await srv.login(empleado.email);
  assert.equal(login.json.data.paso, 'verificar');
  flujo.verify = login.json.data.tokenTemporal;
  await olvidarPaso(empleado.id); // el paso actual ya se usó al activar

  const codigo = codigoTotp(flujo.secreto);
  const ok = await post('/auth/2fa/verificar', flujo.verify, { codigo });
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(ok.json.data).sort(), ['token', 'usuario']);
  flujo.sesion = ok.json.data.token;
  assert.equal((await srv.api('GET', '/auth/me', { token: flujo.sesion })).status, 200);

  const repetido = await post('/auth/2fa/verificar', flujo.verify, { codigo });
  assert.equal(repetido.status, 401);
  assert.equal(repetido.json.message, 'Código inválido o vencido.');
});

test('alta 5: un código de respaldo (normalizado) funciona una sola vez; los dos campos o ninguno → 400', async () => {
  const codigo = flujo.codigos[0];
  const variante = ` ${codigo.toLowerCase().replace('-', ' ')} `;
  const ok = await post('/auth/2fa/verificar', flujo.verify, { codigoRespaldo: variante });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.data.token);

  const otraVez = await post('/auth/2fa/verificar', flujo.verify, { codigoRespaldo: codigo });
  assert.equal(otraVez.status, 401);
  assert.equal(otraVez.json.message, 'Código inválido o vencido.');

  assert.equal((await post('/auth/2fa/verificar', flujo.verify, { codigo: '123456', codigoRespaldo: codigo })).status, 400);
  assert.equal((await post('/auth/2fa/verificar', flujo.verify, {})).status, 400);
});

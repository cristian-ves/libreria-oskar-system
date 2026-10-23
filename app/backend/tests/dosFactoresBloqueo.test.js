const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Usuario } = require('../src/models');
const {
  crearFabrica, levantarServidor, tokenTemporal, tokenSesion, codigoTotp, codigoErroneo,
  activarDirecto, estadoBd,
} = require('./helpers/dosFactores');

let fabrica;
let srv;

before(async () => {
  fabrica = crearFabrica('2fa-bloqueo');
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

/** Usuario con 2FA activo y una función para enviar el segundo paso. */
async function preparar() {
  const usuario = await fabrica.crear('Empleado');
  const { secreto, codigosRespaldo } = await activarDirecto(usuario);
  const token = tokenTemporal(usuario, '2fa-verify');
  const verificar = (body) => srv.api('POST', '/auth/2fa/verificar', { token, body });
  return { usuario, secreto, codigosRespaldo, verificar };
}

const bloqueadoEnBd = async (id) => {
  const [[fila]] = await sequelize.query(
    'SELECT dos_factores_bloqueado_hasta > CURRENT_TIMESTAMP AS bloqueado FROM usuarios WHERE id = $1', { bind: [id] }
  );
  return fila.bloqueado === true;
};

test('bloqueo: 4 fallos → 401, el 5.º → 429 y con bloqueo un código correcto también → 429', async () => {
  const { usuario, secreto, verificar } = await preparar();
  for (let i = 1; i <= 4; i += 1) {
    assert.equal((await verificar({ codigo: codigoErroneo(secreto) })).status, 401);
    assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, i);
  }
  const quinto = await verificar({ codigo: codigoErroneo(secreto) });
  assert.equal(quinto.status, 429);
  assert.equal(await bloqueadoEnBd(usuario.id), true);

  const correcto = await verificar({ codigo: codigoTotp(secreto) });
  assert.equal(correcto.status, 429);
  assert.equal(correcto.json.message, quinto.json.message);
  // Con bloqueo, incluso un formato inválido responde 429.
  assert.equal((await verificar({ codigo: 'xx' })).status, 429);
});

test('bloqueo: con bloqueado_hasta en el pasado vuelve a funcionar y el éxito reinicia contador y bloqueo', async () => {
  const { usuario, secreto, verificar } = await preparar();
  for (let i = 0; i < 5; i += 1) await verificar({ codigo: codigoErroneo(secreto) });
  assert.equal(await bloqueadoEnBd(usuario.id), true);

  await Usuario.update(
    { dos_factores_bloqueado_hasta: sequelize.literal("CURRENT_TIMESTAMP - interval '1 minute'") },
    { where: { id: usuario.id } }
  );
  await verificar({ codigo: codigoErroneo(secreto) }); // un fallo tras el bloqueo vencido
  assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, 1);
  const ok = await verificar({ codigo: codigoTotp(secreto) });
  assert.equal(ok.status, 200);
  const fila = await estadoBd(usuario.id);
  assert.equal(fila.dos_factores_intentos, 0);
  assert.equal(fila.dos_factores_bloqueado_hasta, null);
});

test('bloqueo: TOTP y respaldo comparten contador; un código repetido cuenta como fallo', async () => {
  const { usuario, secreto, codigosRespaldo, verificar } = await preparar();
  const codigo = codigoTotp(secreto);
  assert.equal((await verificar({ codigo })).status, 200);
  assert.equal((await verificar({ codigo })).status, 401); // repetición
  assert.equal((await verificar({ codigoRespaldo: codigosRespaldo[0] })).status, 200);
  assert.equal((await verificar({ codigoRespaldo: codigosRespaldo[0] })).status, 401); // ya usado
  assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, 1);
  assert.equal((await verificar({ codigoRespaldo: 'ZZZZZ-ZZZZZ' })).status, 401);
  assert.equal((await verificar({ codigo: codigoErroneo(secreto) })).status, 401);
  assert.equal((await verificar({ codigo })).status, 401);
  assert.equal((await verificar({ codigoRespaldo: 'YYYYY-YYYYY' })).status, 429);
});

test('bloqueo: el fallo en regenerar (400) queda registrado', async () => {
  const { usuario, secreto } = await preparar();
  const res = await srv.api('POST', '/auth/2fa/respaldo/regenerar', {
    token: tokenSesion(usuario), body: { codigo: codigoErroneo(secreto) },
  });
  assert.equal(res.status, 400);
  assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, 1);
});

test('concurrencia: el mismo TOTP enviado dos veces en paralelo da exactamente un éxito', async () => {
  const { secreto, verificar } = await preparar();
  const codigo = codigoTotp(secreto);
  const estados = (await Promise.all([1, 2, 3].map(() => verificar({ codigo })))).map((r) => r.status).sort();
  assert.deepEqual(estados, [200, 401, 401]);
});

test('concurrencia: el mismo código de respaldo en paralelo da exactamente un éxito', async () => {
  const { codigosRespaldo, verificar } = await preparar();
  const body = { codigoRespaldo: codigosRespaldo[3] };
  const estados = (await Promise.all([1, 2, 3].map(() => verificar(body)))).map((r) => r.status).sort();
  assert.deepEqual(estados, [200, 401, 401]);
});

test('concurrencia: cinco fallos simultáneos dejan al usuario bloqueado', async () => {
  const { usuario, secreto, verificar } = await preparar();
  const estados = (await Promise.all([1, 2, 3, 4, 5].map(() => verificar({ codigo: codigoErroneo(secreto) }))))
    .map((r) => r.status);
  assert.ok(estados.includes(429));
  assert.ok(estados.every((s) => s === 401 || s === 429));
  assert.equal(await bloqueadoEnBd(usuario.id), true);
  assert.equal((await verificar({ codigo: codigoTotp(secreto) })).status, 429);
});

test('falla cerrada: un secreto ilegible nunca concede acceso ni registra datos sensibles', async (t) => {
  const { usuario, secreto, verificar } = await preparar();
  const original = (await estadoBd(usuario.id)).dos_factores_secreto;
  const partes = original.split(':');
  partes[3] = Buffer.from('manipulado-manipulado-manipulado').toString('base64url');
  await Usuario.update({ dos_factores_secreto: partes.join(':') }, { where: { id: usuario.id } });

  const errores = [];
  t.mock.method(console, 'error', (...args) => errores.push(args.map(String).join(' ')));
  const res = await verificar({ codigo: codigoTotp(secreto) });
  assert.equal(res.status, 500);
  assert.equal(res.json.message, 'Error interno del servidor.');
  assert.ok(errores.some((e) => e.startsWith('[2FA]')));
  errores.forEach((e) => {
    assert.ok(!e.includes(secreto) && !e.includes(original) && !e.includes(partes[3]));
  });
  assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, 0);
});

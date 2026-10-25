const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mailService = require('../src/services/mail.service');
const { sequelize, Usuario } = require('../src/models');
const { PASSWORD, crearFabrica, levantarServidor, estadoBd } = require('./helpers/dosFactores');
const {
  NUEVA, reiniciarLimites, correosPara, conLimitesLibres, restablecer, solicitarToken, envejecerEnlace,
} = require('./helpers/recuperacion');

const INVALIDO = 'El enlace no es válido o ya venció. Solicita uno nuevo.';

let fabrica;
let srv;

before(async () => {
  fabrica = crearFabrica('restablecer');
  srv = await levantarServidor();
});

beforeEach(() => mailService.vaciarBandeja());

after(async () => {
  try {
    reiniciarLimites();
    await srv.cerrar();
    await fabrica.limpiar();
  } finally {
    await sequelize.close();
  }
});

const nuevoConToken = async (rol = 'Empleado') => {
  const usuario = await fabrica.crear(rol);
  return { usuario, token: await solicitarToken(srv, usuario.email) };
};

test('restablecer: éxito, sin caché, consume el token y envía el aviso; el reuso falla', async () => {
  const { usuario, token } = await nuevoConToken();
  mailService.vaciarBandeja();
  const ok = await restablecer(srv, token);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json, { status: 'success', data: { restablecido: true } });
  assert.equal(ok.headers.get('cache-control'), 'no-store');

  const fila = await estadoBd(usuario.id);
  assert.equal(fila.token_recuperacion, null);
  assert.equal(fila.token_recuperacion_expira, null);
  assert.ok(fila.password_cambiada_en instanceof Date);

  const [aviso, ...resto] = await correosPara(usuario.email);
  assert.equal(resto.length, 0);
  assert.match(aviso.asunto, /cambió tu contraseña/);
  assert.match(aviso.texto, /contacta al administrador/);
  assert.equal(/#token=/.test(aviso.texto), false);

  const reuso = await restablecer(srv, token, 'OtraClave2026x');
  assert.equal(reuso.status, 400);
  assert.equal(reuso.json.message, INVALIDO);
  assert.equal((await srv.login(usuario.email, NUEVA)).status, 200);
  assert.equal((await srv.login(usuario.email, PASSWORD)).status, 401);
});

test('restablecer: token mal formado, inexistente o vencido → 400 con el mismo mensaje', async () => {
  const { usuario, token } = await nuevoConToken();
  const otro = token.split('').reverse().join('');
  for (const malo of [undefined, '', 'corto', `${token}x`, `${token.slice(1)}=`, 12345, otro]) {
    const res = await restablecer(srv, malo);
    assert.equal(res.status, 400, `token=${String(malo).length}`);
    assert.deepEqual(res.json, { status: 'fail', message: INVALIDO });
  }
  await envejecerEnlace(usuario.id, 31); // vencimiento 1 minuto en el pasado (hora de la BD)
  const vencido = await restablecer(srv, token);
  assert.deepEqual(vencido.json, { status: 'fail', message: INVALIDO });
  assert.equal((await srv.login(usuario.email, PASSWORD)).status, 200, 'la contraseña no cambió');
});

test('restablecer: política incumplida o contraseña igual a la actual → 400 sin consumir el enlace', async () => {
  const { usuario, token } = await nuevoConToken();
  for (const [password, mensaje] of [
    [null, /obligatoria/], ['', /obligatoria/], ['corta1', /10 caracteres/], ['solamenteletras', /número/], ['1234567890', /letra/],
    [`a1${'ñ'.repeat(40)}`, /72 bytes/],
  ]) {
    const res = await restablecer(srv, token, password);
    assert.equal(res.status, 400);
    assert.match(res.json.message, mensaje);
  }
  const igual = await restablecer(srv, token, PASSWORD);
  assert.equal(igual.status, 400);
  assert.equal(igual.json.message, 'La nueva contraseña debe ser distinta de la actual.');
  assert.notEqual((await estadoBd(usuario.id)).token_recuperacion, null);

  assert.equal((await restablecer(srv, token)).status, 200, 'el enlace seguía sirviendo');
});

test('restablecer: usuario desactivado después de solicitar → 400', async () => {
  const { usuario, token } = await nuevoConToken();
  await Usuario.update({ activo: false }, { where: { id: usuario.id } });
  const res = await restablecer(srv, token);
  assert.deepEqual(res.json, { status: 'fail', message: INVALIDO });
  assert.equal((await estadoBd(usuario.id)).password_cambiada_en, null);
});

test('restablecer: concurrencia con el mismo enlace → exactamente un 200 y un 400', async () => {
  const { usuario, token } = await nuevoConToken('Administrador');
  const api = conLimitesLibres(srv);
  const claves = ['Concurrente1aaa', 'Concurrente2bbb'];
  const respuestas = await Promise.all(claves.map((password) =>
    api('POST', '/auth/restablecer', { body: { token, password } })));
  assert.deepEqual(respuestas.map((r) => r.status).sort(), [200, 400]);
  const ganadora = claves[respuestas.findIndex((r) => r.status === 200)];
  const perdedora = claves.find((c) => c !== ganadora);
  assert.equal(respuestas.find((r) => r.status === 400).json.message, INVALIDO);
  assert.equal((await srv.login(usuario.email, ganadora)).status, 200);
  assert.equal((await srv.login(usuario.email, perdedora)).status, 401);
  assert.equal((await correosPara(usuario.email)).filter((m) => /cambió/.test(m.asunto)).length, 1);
});

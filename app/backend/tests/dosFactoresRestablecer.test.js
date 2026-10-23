const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sequelize, Usuario } = require('../src/models');
const dosFactoresService = require('../src/services/dosFactores.service');
const { NotFoundError } = require('../src/utils/errors');
const {
  crearFabrica, levantarServidor, tokenSesion, activarDirecto, conObligatorio, estadoBd, respaldosBd,
} = require('./helpers/dosFactores');

const UUID_INEXISTENTE = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
let fabrica;
let srv;
let admin;
let empleado;

before(async () => {
  fabrica = crearFabrica('2fa-reset');
  admin = await fabrica.crear('Administrador');
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

const restablecer = (id, token) => srv.api('POST', `/auth/2fa/usuarios/${id}/restablecer`, { token });

async function assertRestablecido(id) {
  const fila = await estadoBd(id);
  assert.equal(fila.dos_factores_activo, false);
  assert.equal(fila.dos_factores_secreto, null);
  assert.equal(fila.dos_factores_intentos, 0);
  assert.equal(fila.dos_factores_bloqueado_hasta, null);
  assert.equal(fila.dos_factores_ultimo_paso, null);
  assert.equal((await respaldosBd(id)).length, 0);
}

function correrScript(...args) {
  return spawnSync(process.execPath, [path.join('src', 'scripts', 'reset-2fa.js'), ...args], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 30000,
  });
}

test('restablecer: 401 sin token, 403 Empleado, 400 id inválido, 404 inexistente, 403 a sí mismo', async () => {
  const objetivo = await fabrica.crear('Empleado');
  assert.equal((await restablecer(objetivo.id)).status, 401);
  assert.equal((await restablecer(objetivo.id, tokenSesion(empleado))).status, 403);
  assert.equal((await restablecer('no-es-uuid', tokenSesion(admin))).status, 400);
  assert.equal((await restablecer(UUID_INEXISTENTE, tokenSesion(admin))).status, 404);
  const propio = await restablecer(admin.id, tokenSesion(admin));
  assert.equal(propio.status, 403);
  assert.match(propio.json.message, /reset-2fa/);
  const propioMayus = await restablecer(admin.id.toUpperCase(), tokenSesion(admin));
  assert.equal(propioMayus.status, 403);
});

test('restablecer: borra secreto, códigos, contador, bloqueo y paso; con 2FA obligatorio el login pide configurar', async () => {
  const objetivo = await fabrica.crear('Empleado');
  await activarDirecto(objetivo);
  await Usuario.update(
    { dos_factores_intentos: 3, dos_factores_ultimo_paso: 123, dos_factores_bloqueado_hasta: sequelize.literal('CURRENT_TIMESTAMP') },
    { where: { id: objetivo.id } }
  );
  assert.equal((await srv.login(objetivo.email)).json.data.paso, 'verificar');

  const res = await restablecer(objetivo.id, tokenSesion(admin));
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, { restablecido: true });
  await assertRestablecido(objetivo.id);

  await conObligatorio(async () => {
    assert.equal((await srv.login(objetivo.email)).json.data.paso, 'configurar');
  });
  assert.deepEqual(Object.keys((await srv.login(objetivo.email)).json.data).sort(), ['token', 'usuario']);
});

test('restablecerPorEmail (lógica del script): ignora mayúsculas y lanza NotFoundError si no existe', async () => {
  const objetivo = await fabrica.crear('Administrador');
  await activarDirecto(objetivo);
  assert.deepEqual(await dosFactoresService.restablecerPorEmail(objetivo.email.toUpperCase()), { restablecido: true });
  await assertRestablecido(objetivo.id);
  await assert.rejects(() => dosFactoresService.restablecerPorEmail('nadie-2fa@example.test'), NotFoundError);
});

test('script reset-2fa: sin argumento y con email inexistente sale con 1', () => {
  const sinArgumento = correrScript();
  assert.equal(sinArgumento.status, 1);
  assert.match(sinArgumento.stderr, /Uso: npm run reset-2fa -- correo@dominio\.com/);

  const inexistente = correrScript('nadie-2fa@example.test');
  assert.equal(inexistente.status, 1);
  assert.match(inexistente.stderr, /No existe un usuario/);
});

test('script reset-2fa: con email existente restablece, sale con 0 y no imprime secretos', async () => {
  const objetivo = await fabrica.crear('Administrador');
  const { secreto, codigosRespaldo } = await activarDirecto(objetivo);
  const cifrado = (await estadoBd(objetivo.id)).dos_factores_secreto;

  const salida = correrScript(objetivo.email);
  assert.equal(salida.status, 0);
  assert.match(salida.stdout, /restablecida/);
  const texto = salida.stdout + salida.stderr;
  [secreto, cifrado, ...codigosRespaldo].forEach((s) => assert.ok(!texto.includes(s)));
  await assertRestablecido(objetivo.id);
});

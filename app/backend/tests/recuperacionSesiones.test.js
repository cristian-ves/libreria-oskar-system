const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const appEnv = require('../src/config/env');
const mailService = require('../src/services/mail.service');
const { sequelize } = require('../src/models');
const {
  PASSWORD, crearFabrica, levantarServidor, tokenSesion, codigoTotp, activarDirecto, estadoBd,
} = require('./helpers/dosFactores');
const {
  NUEVA, reiniciarLimites, sha256, correosPara, restablecer, solicitarToken, adelantarCambio,
} = require('./helpers/recuperacion');

const SESION_INVALIDA = 'La sesión ya no es válida. Inicie sesión de nuevo.';
const SENSIBLES = ['token_recuperacion', 'password_hash', 'password_cambiada_en'];

let fabrica;
let srv;

before(async () => {
  fabrica = crearFabrica('rec-sesion');
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

// JWT de sesión firmado 10 s antes de ahora: emitido antes de cualquier restablecimiento de la prueba.
const tokenAnterior = (usuario, extra = {}) =>
  jwt.sign({ sub: usuario.id, iat: Math.floor(Date.now() / 1000) - 10, ...extra }, appEnv.jwt.secret, { expiresIn: '10m' });

test('sesiones: los JWT emitidos antes del restablecimiento dejan de valer; los demás siguen', async () => {
  const admin = await fabrica.crear('Administrador');
  const testigo = await fabrica.crear('Administrador');
  const sesion = tokenAnterior(admin);
  const temporal = tokenAnterior(admin, { scope: '2fa-verify' });
  assert.equal((await srv.api('GET', '/auth/me', { token: sesion })).status, 200, 'vale antes del cambio');

  assert.equal((await restablecer(srv, await solicitarToken(srv, admin.email))).status, 200);

  for (const ruta of ['/auth/me', '/usuarios']) {
    const res = await srv.api('GET', ruta, { token: sesion });
    assert.equal(res.status, 401, ruta);
    assert.deepEqual(res.json, { status: 'fail', message: SESION_INVALIDA });
  }
  const verificar = await srv.api('POST', '/auth/2fa/verificar', { token: temporal, body: { codigo: '123456' } });
  assert.deepEqual([verificar.status, verificar.json.message], [401, SESION_INVALIDA]);

  // Sin cambio registrado (como el seed y los helpers): sigue funcionando.
  assert.equal((await estadoBd(testigo.id)).password_cambiada_en, null);
  assert.equal((await srv.api('GET', '/auth/me', { token: tokenSesion(testigo) })).status, 200);
  assert.equal((await srv.api('GET', '/usuarios', { token: tokenAnterior(testigo) })).status, 200);
});

test('sesiones: el login posterior con la contraseña nueva abre una sesión válida; la anterior falla', async () => {
  const empleado = await fabrica.crear('Empleado');
  assert.equal((await restablecer(srv, await solicitarToken(srv, empleado.email))).status, 200);
  assert.equal((await srv.login(empleado.email, PASSWORD)).status, 401);

  // Determinista y sin esperas: el cambio queda 2 s antes, así el iat del login es posterior.
  await adelantarCambio(empleado.id);
  const login = await srv.login(empleado.email, NUEVA);
  assert.equal(login.status, 200);
  const me = await srv.api('GET', '/auth/me', { token: login.json.data.token });
  assert.equal(me.status, 200);
  assert.deepEqual(Object.keys(me.json.data).sort(), ['email', 'id', 'nombre_completo', 'rol']);
});

test('sesiones: con 2FA activo el restablecimiento no lo desactiva y el login sigue pidiendo verificar', async () => {
  const admin = await fabrica.crear('Administrador');
  const { secreto } = await activarDirecto(admin);
  const antes = await estadoBd(admin.id);

  assert.equal((await restablecer(srv, await solicitarToken(srv, admin.email))).status, 200);
  const despues = await estadoBd(admin.id);
  for (const campo of ['dos_factores_activo', 'dos_factores_secreto', 'dos_factores_intentos', 'dos_factores_bloqueado_hasta']) {
    assert.deepEqual(despues[campo], antes[campo], campo);
  }
  assert.equal(despues.dos_factores_activo, true);

  await adelantarCambio(admin.id);
  const login = await srv.login(admin.email, NUEVA);
  assert.equal(login.status, 200);
  assert.equal(login.json.data.paso, 'verificar');
  const verificar = await srv.api('POST', '/auth/2fa/verificar', {
    token: login.json.data.tokenTemporal, body: { codigo: codigoTotp(secreto) },
  });
  assert.equal(verificar.status, 200);
  assert.ok(verificar.json.data.token);
});

test('secretos: ni el token, ni su hash, ni la contraseña, ni el correo aparecen en consola o respuestas', async () => {
  const admin = await fabrica.crear('Administrador');
  const capturado = [];
  const originales = { log: console.log, warn: console.warn, error: console.error };
  for (const nivel of Object.keys(originales)) {
    console[nivel] = (...args) => capturado.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  }
  const respuestas = [];
  let token;
  reiniciarLimites();
  try {
    const solicitud = await srv.api('POST', '/auth/recuperar', { body: { email: admin.email } });
    respuestas.push(solicitud);
    await correosPara(admin.email);
    token = (mailService.bandeja.at(-1).texto.match(/#token=([A-Za-z0-9_-]{43})/) || [])[1];
    respuestas.push(await srv.api('POST', '/auth/restablecer', { body: { token, password: 'corta' } }));
    respuestas.push(await srv.api('POST', '/auth/restablecer', { body: { token, password: PASSWORD } }));
    respuestas.push(await srv.api('POST', '/auth/restablecer', { body: { token, password: NUEVA } }));
    respuestas.push(await srv.api('POST', '/auth/restablecer', { body: { token, password: NUEVA } }));
    await correosPara(admin.email);
    await adelantarCambio(admin.id);
    const login = await srv.login(admin.email, NUEVA);
    respuestas.push(await srv.api('GET', '/auth/me', { token: login.json.data.token }));
    respuestas.push(await srv.api('GET', '/usuarios', { token: login.json.data.token }));
  } finally {
    Object.assign(console, originales);
    reiniciarLimites();
  }
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(respuestas.map((r) => r.status), [200, 400, 400, 200, 400, 200, 200]);
  assert.ok(capturado.some((linea) => linea.includes(`[RECUPERACION] Contraseña restablecida para el usuario ${admin.id}`)));
  const salida = capturado.join('\n');
  for (const secreto of [token, sha256(token), NUEVA, PASSWORD, admin.email]) {
    assert.equal(salida.includes(secreto), false, 'dato sensible en consola');
  }
  for (const res of respuestas) {
    const cuerpo = JSON.stringify(res.json);
    assert.equal(cuerpo.includes(token), false);
    for (const campo of SENSIBLES) assert.equal(cuerpo.includes(campo), false, campo);
  }
});

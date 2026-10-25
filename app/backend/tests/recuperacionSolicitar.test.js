const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const appEnv = require('../src/config/env');
const mailService = require('../src/services/mail.service');
const loginRateLimit = require('../src/middlewares/rateLimit');
const { sequelize } = require('../src/models');
const { crearFabrica, levantarServidor, estadoBd } = require('./helpers/dosFactores');
const {
  reiniciarLimites, sha256, tokenDe, correosPara, recuperar, restablecer, solicitarToken, envejecerEnlace,
} = require('./helpers/recuperacion');

const MENSAJE = 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña. '
  + 'Revisa también la carpeta de spam. El enlace vence en 30 minutos.';

let fabrica;
let srv;
const u = {};

before(async () => {
  fabrica = crearFabrica('recuperar');
  u.activo = await fabrica.crear('Empleado');
  u.inactivo = await fabrica.crear('Empleado', { activo: false });
  u.limites = await fabrica.crear('Empleado');
  u.enfriamiento = await fabrica.crear('Administrador');
  u.hash = await fabrica.crear('Usuario');
  srv = await levantarServidor();
});

beforeEach(() => mailService.vaciarBandeja());

after(async () => {
  try {
    reiniciarLimites();
    loginRateLimit.reset();
    await srv.cerrar();
    await fabrica.limpiar();
  } finally {
    await sequelize.close();
  }
});

test('recuperar: respuesta idéntica para correo existente, inexistente e inactivo; un solo correo', async () => {
  const existente = await recuperar(srv, u.activo.email.toUpperCase());
  const inexistente = await recuperar(srv, `nadie-${Date.now()}@example.test`);
  const inactivo = await recuperar(srv, u.inactivo.email);
  for (const res of [existente, inexistente, inactivo]) {
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
  assert.deepEqual(existente.json, { status: 'success', data: { mensaje: MENSAJE } });
  assert.deepEqual(inexistente.json, existente.json);
  assert.deepEqual(inactivo.json, existente.json);

  await correosPara(u.activo.email);
  assert.equal(mailService.bandeja.length, 1, 'solo la cuenta existente y activa recibe correo');
  const [correo] = mailService.bandeja;
  assert.deepEqual(correo.para, [u.activo.email]);
  assert.equal(/[\r\n]/.test(correo.asunto), false);
  assert.match(correo.texto, /^http:\/\/localhost:5173\/restablecer#token=[A-Za-z0-9_-]{43}$/m);
  assert.equal(correo.texto.includes('?token='), false, 'el token va en el fragmento, no en la query');
  assert.match(correo.texto, /30 minutos/);
  assert.match(correo.texto, /ignora este mensaje/);
  assert.match(correo.texto, /administrador/);
  assert.equal(typeof correo.html, 'string');
  assert.ok(correo.texto.includes(u.activo.nombre_completo));
  assert.equal((await estadoBd(u.inactivo.id)).token_recuperacion, null);
});

test('recuperar: la BD guarda solo el SHA-256 del token, nunca el token en claro', async () => {
  const token = await solicitarToken(srv, u.hash.email);
  const fila = await estadoBd(u.hash.id);
  assert.match(fila.token_recuperacion, /^[0-9a-f]{64}$/);
  assert.equal(fila.token_recuperacion, sha256(token));
  assert.equal(JSON.stringify(fila).includes(token), false);
  const minutos = (new Date(fila.token_recuperacion_expira) - Date.now()) / 60000;
  assert.ok(minutos > 28 && minutos <= 30.1, 'vence en ~30 minutos');
});

test('recuperar: formato inválido responde 400', async () => {
  for (const email of [undefined, '', '   ', 42, ['a@b.co'], `${'a'.repeat(140)}@example.test`]) {
    const res = await recuperar(srv, email);
    assert.equal(res.status, 400, `email=${JSON.stringify(email)}`);
    assert.equal(res.json.status, 'fail');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await correosPara(u.activo.email)).length, 0);
});

test('recuperar: enfriamiento de 2 minutos; vencido, el enlace nuevo reemplaza al anterior', async () => {
  const email = u.enfriamiento.email;
  const primero = await solicitarToken(srv, email);
  const hashPrimero = (await estadoBd(u.enfriamiento.id)).token_recuperacion;

  const segunda = await recuperar(srv, email);
  assert.equal(segunda.status, 200);
  assert.equal((await correosPara(email)).length, 1, 'la solicitud inmediata no envía otro correo');
  assert.equal((await estadoBd(u.enfriamiento.id)).token_recuperacion, hashPrimero);

  await envejecerEnlace(u.enfriamiento.id, 3);
  const segundo = await solicitarToken(srv, email);
  assert.equal((await correosPara(email)).length, 2);
  assert.notEqual(segundo, primero);
  assert.equal((await estadoBd(u.enfriamiento.id)).token_recuperacion, sha256(segundo));

  const viejo = await restablecer(srv, primero);
  assert.equal(viejo.status, 400);
  assert.equal(viejo.json.message, 'El enlace no es válido o ya venció. Solicita uno nuevo.');
});

test('recuperar: sin FRONTEND_URL falla cerrado (misma respuesta, sin correo ni token)', async () => {
  const previo = appEnv.recuperacion.frontendUrl;
  const avisos = [];
  const warnOriginal = console.warn;
  appEnv.recuperacion.frontendUrl = null;
  console.warn = (...args) => avisos.push(args.join(' '));
  try {
    const res = await recuperar(srv, u.limites.email);
    assert.equal(res.status, 200);
    assert.equal(res.json.data.mensaje, MENSAJE);
  } finally {
    appEnv.recuperacion.frontendUrl = previo;
    console.warn = warnOriginal;
  }
  assert.equal((await correosPara(u.limites.email)).length, 0);
  assert.equal((await estadoBd(u.limites.id)).token_recuperacion, null);
  assert.ok(avisos.some((a) => a.startsWith('[RECUPERACION]') && a.includes('FRONTEND_URL')));
  assert.equal(avisos.some((a) => a.includes(u.limites.email)), false);
});

test('límites: 6.ª solicitud y 11.º restablecimiento por IP → 429, sin compartir contador con el login', async () => {
  // Servidor propio y fetch directo: el helper de 2FA reinicia el limitador del login en cada login.
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const post = async (ruta, body) => {
    const res = await fetch(`http://localhost:${server.address().port}/api${ruta}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json(), headers: res.headers };
  };
  const login = () => post('/auth/login', { email: u.limites.email, password: 'NoEsLaClave123' });
  try {
    reiniciarLimites();
    loginRateLimit.reset();
    for (let i = 0; i < 5; i += 1) assert.equal((await post('/auth/recuperar', { email: `x${i}@example.test` })).status, 200);
    const sexta = await post('/auth/recuperar', { email: 'x@example.test' });
    assert.equal(sexta.status, 429);
    assert.equal(sexta.json.status, 'fail');
    assert.equal(sexta.headers.get('cache-control'), 'no-store');

    for (let i = 0; i < 10; i += 1) assert.equal((await post('/auth/restablecer', { token: 'x' })).status, 400);
    assert.equal((await post('/auth/restablecer', { token: 'x' })).status, 429);
    assert.equal((await login()).status, 401, 'el login no contó las peticiones de recuperación');

    // A la inversa: con el login agotado, recuperar y restablecer siguen respondiendo.
    reiniciarLimites();
    loginRateLimit.reset();
    for (let i = 0; i < appEnv.loginRateLimit; i += 1) await login();
    assert.equal((await login()).status, 429);
    assert.equal((await post('/auth/recuperar', { email: 'x@example.test' })).status, 200);
    assert.equal((await post('/auth/restablecer', { token: 'x' })).status, 400);
  } finally {
    reiniciarLimites();
    loginRateLimit.reset();
    await new Promise((resolve) => server.close(resolve));
  }
});

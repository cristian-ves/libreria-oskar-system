const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const appEnv = require('../src/config/env');
const mailService = require('../src/services/mail.service');
const recuperacionService = require('../src/services/recuperacion.service');
const { sequelize } = require('../src/models');
const { crearFabrica, levantarServidor, estadoBd } = require('./helpers/dosFactores');
const {
  reiniciarLimites, tokenDe, correosPara, recuperar, restablecer, solicitarToken,
} = require('./helpers/recuperacion');

let fabrica;
let srv;

before(async () => {
  fabrica = crearFabrica('correo-html');
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

test('recuperar: el correo trae texto, html y el logo en línea con el mismo cid del html', async () => {
  const usuario = await fabrica.crear('Empleado');
  assert.equal((await recuperar(srv, usuario.email)).status, 200);
  const [correo, ...resto] = await correosPara(usuario.email);
  assert.equal(resto.length, 0);
  const token = tokenDe(correo);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);

  assert.equal(typeof correo.texto, 'string');
  assert.equal(correo.adjuntos.length, 1);
  const [logo] = correo.adjuntos;
  assert.equal(logo.tipo, 'image/png');
  assert.match(logo.cid, /^[A-Za-z0-9._-]+$/);
  assert.ok(logo.bytes > 0 && logo.bytes <= 20 * 1024);
  assert.equal('contenido' in logo, false, 'la bandeja no guarda el binario');

  assert.ok(correo.html.includes(`src="cid:${logo.cid}"`));
  const enlace = `http://localhost:5173/restablecer#token=${token}`;
  assert.equal(correo.html.split(`href="${enlace}"`).length - 1, 2, 'botón y enlace en texto');
  assert.ok(correo.html.includes('Restablecer contraseña'));
  assert.ok(correo.html.includes(usuario.nombre_completo));
});

test('restablecer: el aviso también trae html (sin botón ni token) y el logo', async () => {
  const usuario = await fabrica.crear('Administrador');
  const token = await solicitarToken(srv, usuario.email);
  mailService.vaciarBandeja();
  assert.equal((await restablecer(srv, token)).status, 200);
  const [aviso] = await correosPara(usuario.email);
  assert.match(aviso.asunto, /cambió tu contraseña/);
  assert.match(aviso.html, /se cerraron las sesiones anteriores/);
  assert.equal(/href=|#token=/.test(aviso.html), false);
  assert.equal(aviso.adjuntos.length, 1);
});

test('si construir el mensaje lanza, la respuesta es idéntica a la de un correo inexistente y solo se registra', async () => {
  const usuario = await fabrica.crear('Empleado');
  const previo = appEnv.recuperacion.frontendUrl;
  const avisos = [];
  const warnOriginal = console.warn;
  // El enlace se arma dentro de la construcción del mensaje: forzamos que lance ahí.
  appEnv.recuperacion.frontendUrl = { [Symbol.toPrimitive]() { throw new Error(`plantilla rota ${usuario.email}`); } };
  console.warn = (...args) => avisos.push(args.join(' '));
  let existente;
  let inexistente;
  try {
    existente = await recuperar(srv, usuario.email);
    await recuperacionService.esperarEnvios();
    inexistente = await recuperar(srv, `nadie-${Date.now()}@example.test`);
  } finally {
    appEnv.recuperacion.frontendUrl = previo;
    console.warn = warnOriginal;
  }
  assert.deepEqual([existente.status, existente.json], [inexistente.status, inexistente.json]);
  assert.equal(existente.status, 200);
  assert.equal(existente.headers.get('cache-control'), inexistente.headers.get('cache-control'));

  assert.equal((await correosPara(usuario.email)).length, 0);
  assert.match((await estadoBd(usuario.id)).token_recuperacion, /^[0-9a-f]{64}$/, 'el token se emitió antes del fallo');
  const registro = avisos.filter((a) => a.startsWith('[RECUPERACION]') && a.includes(usuario.id));
  assert.equal(registro.length, 1);
  const todo = avisos.join('\n');
  assert.equal(todo.includes(usuario.email), false);
  assert.equal(/[A-Za-z0-9_-]{43}/.test(todo), false, 'sin token en el registro');
});

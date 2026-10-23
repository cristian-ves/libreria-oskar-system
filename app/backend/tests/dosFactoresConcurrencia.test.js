const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Usuario } = require('../src/models');
const totp = require('../src/services/dosFactores/totp');
const dosFactoresRepository = require('../src/repositories/dosFactores.repository');
const dosFactoresService = require('../src/services/dosFactores.service');
const { ALCANCE_CONFIGURAR, ALCANCE_VERIFICAR } = require('../src/services/dosFactores/sesion');
const {
  crearFabrica, levantarServidor, tokenTemporal, tokenSesion, codigoTotp, activarDirecto, estadoBd,
} = require('./helpers/dosFactores');

// Con 30 peticiones simultáneas y ningún código correcto, la reserva atómica deja pasar
// exactamente 5 verificaciones: 4 responden el error del código y la 5.ª (que fija el bloqueo)
// y las 25 sin cupo responden 429, sin importar el orden de llegada.
const N = 30;
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

let fabrica;
let srv;

before(async () => {
  fabrica = crearFabrica('2fa-concurrencia');
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

/** `n` códigos de 6 dígitos distintos entre sí y fuera de la ventana actual (±2 pasos). */
function codigosErroneos(secreto, n) {
  const ahora = Date.now() / 1000;
  const ventana = new Set([-2, -1, 0, 1, 2].map((d) => codigoTotp(secreto, ahora + d * 30)));
  const codigos = [];
  for (let i = 0; codigos.length < n; i += 1) {
    const candidato = String((100003 + i * 7919) % 1000000).padStart(6, '0');
    if (!ventana.has(candidato)) codigos.push(candidato);
  }
  return codigos;
}

/** Ejecuta `fn` contando las llamadas a `objeto[metodo]`; restaura el original siempre. */
async function contando(objeto, metodo, fn) {
  const original = objeto[metodo];
  let llamadas = 0;
  objeto[metodo] = (...args) => {
    llamadas += 1;
    return original.apply(objeto, args);
  };
  try {
    return { resultado: await fn(), llamadas: () => llamadas };
  } finally {
    objeto[metodo] = original;
  }
}

const conteo = (respuestas) => respuestas.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

async function comprobarRafaga(usuario, cuerpos, enviar, objeto, metodo, statusFallo) {
  const { resultado, llamadas } = await contando(objeto, metodo, () => Promise.all(cuerpos.map(enviar)));
  assert.equal(llamadas(), 5, `exactamente 5 llamadas a ${metodo}`);
  assert.deepEqual(conteo(resultado), { [statusFallo]: 4, 429: N - 4 });
  const fila = await estadoBd(usuario.id);
  assert.equal(fila.dos_factores_intentos, 0);
  assert.ok(fila.dos_factores_bloqueado_hasta !== null);
}

const vencerBloqueo = (id) => Usuario.update(
  { dos_factores_bloqueado_hasta: sequelize.literal("CURRENT_TIMESTAMP - interval '1 minute'") },
  { where: { id } }
);

test('concurrencia: 30 TOTP erróneos simultáneos en verificar → 5 verificaciones, 4×401 y 26×429', async () => {
  const usuario = await fabrica.crear('Empleado');
  const { secreto } = await activarDirecto(usuario);
  const token = tokenTemporal(usuario, ALCANCE_VERIFICAR);
  const verificar = (body) => srv.api('POST', '/auth/2fa/verificar', { token, body });

  const cuerpos = codigosErroneos(secreto, N).map((codigo) => ({ codigo }));
  await comprobarRafaga(usuario, cuerpos, verificar, totp, 'verificarCodigo', 401);

  // Con bloqueo, un código correcto → 429 sin llegar a verificarse.
  const bloqueado = await contando(totp, 'verificarCodigo', () => verificar({ codigo: codigoTotp(secreto) }));
  assert.equal(bloqueado.resultado.status, 429);
  assert.equal(bloqueado.llamadas(), 0);

  await vencerBloqueo(usuario.id);
  assert.equal((await verificar({ codigo: codigoTotp(secreto) })).status, 200);
  const fila = await estadoBd(usuario.id);
  assert.equal(fila.dos_factores_intentos, 0);
  assert.equal(fila.dos_factores_bloqueado_hasta, null);
});

test('concurrencia: 30 códigos de respaldo falsos simultáneos → 5 consumos intentados, 4×401 y 26×429', async () => {
  const usuario = await fabrica.crear('Empleado');
  const { codigosRespaldo } = await activarDirecto(usuario);
  const token = tokenTemporal(usuario, ALCANCE_VERIFICAR);
  const verificar = (body) => srv.api('POST', '/auth/2fa/verificar', { token, body });

  const cuerpos = Array.from({ length: N }, (_, i) => ({ codigoRespaldo: `ZZZZZ-ZZZZ${ALFABETO[i]}` }));
  await comprobarRafaga(usuario, cuerpos, verificar, dosFactoresRepository, 'consumirRespaldo', 401);

  assert.equal((await verificar({ codigoRespaldo: codigosRespaldo[0] })).status, 429);
  await vencerBloqueo(usuario.id);
  assert.equal((await verificar({ codigoRespaldo: codigosRespaldo[0] })).status, 200);
});

test('concurrencia: 30 TOTP erróneos simultáneos en activar → 5 verificaciones, 4×401 y 26×429', async () => {
  const usuario = await fabrica.crear('Empleado');
  const { secretoManual } = await dosFactoresService.configurar(usuario.id);
  const token = tokenTemporal(usuario, ALCANCE_CONFIGURAR);
  const activar = (body) => srv.api('POST', '/auth/2fa/activar', { token, body });

  const cuerpos = codigosErroneos(secretoManual, N).map((codigo) => ({ codigo }));
  await comprobarRafaga(usuario, cuerpos, activar, totp, 'verificarCodigo', 401);
  assert.equal((await estadoBd(usuario.id)).dos_factores_activo, false);
});

test('concurrencia: 30 TOTP erróneos simultáneos en regenerar → 5 verificaciones, 4×400 y 26×429', async () => {
  const usuario = await fabrica.crear('Empleado');
  const { secreto } = await activarDirecto(usuario);
  const token = tokenSesion(usuario);
  const regenerar = (body) => srv.api('POST', '/auth/2fa/respaldo/regenerar', { token, body });

  const cuerpos = codigosErroneos(secreto, N).map((codigo) => ({ codigo }));
  await comprobarRafaga(usuario, cuerpos, regenerar, totp, 'verificarCodigo', 400);
});

test('reserva: el formato inválido no consume intento', async () => {
  const usuario = await fabrica.crear('Empleado');
  await activarDirecto(usuario);
  const token = tokenTemporal(usuario, ALCANCE_VERIFICAR);
  const verificar = (body) => srv.api('POST', '/auth/2fa/verificar', { token, body });
  assert.equal((await verificar({ codigo: '12ab' })).status, 400);
  assert.equal((await verificar({ codigoRespaldo: 'corto' })).status, 400);
  assert.equal((await estadoBd(usuario.id)).dos_factores_intentos, 0);
});

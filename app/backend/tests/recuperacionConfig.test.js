const { test } = require('node:test');
const assert = require('node:assert/strict');
const { leerConfigRecuperacion } = require('../src/config/recuperacion.config');
const { sesionVigente } = require('../src/utils/sesionVigente');
const { generarToken, hashToken, formatoValido } = require('../src/services/recuperacion/token');
const { enlaceRestablecer } = require('../src/services/recuperacion/correos');

test('config: NODE_ENV=test ignora el entorno y usa el origen local', () => {
  const config = leerConfigRecuperacion({ FRONTEND_URL: 'https://otro.example' }, 'test');
  assert.equal(config.frontendUrl, 'http://localhost:5173');
  assert.deepEqual(config.faltantes, []);
  // Ni siquiera un valor inválido del .env afecta a las pruebas.
  assert.equal(leerConfigRecuperacion({ FRONTEND_URL: 'basura' }, 'test').frontendUrl, 'http://localhost:5173');
});

test('config: desarrollo sin variable usa el valor por defecto; con variable la respeta', () => {
  assert.equal(leerConfigRecuperacion({}, 'development').frontendUrl, 'http://localhost:5173');
  assert.equal(leerConfigRecuperacion({ FRONTEND_URL: ' https://oskar.example ' }, 'development').frontendUrl, 'https://oskar.example');
});

test('config: producción sin variable no lanza, nombra la faltante y deja el envío inhabilitado', () => {
  const config = leerConfigRecuperacion({}, 'production');
  assert.equal(config.frontendUrl, null);
  assert.deepEqual(config.faltantes, ['FRONTEND_URL']);
  assert.equal(leerConfigRecuperacion({ FRONTEND_URL: 'https://oskar.example:8443' }, 'production').frontendUrl, 'https://oskar.example:8443');
});

test('config: URL inválida, con ruta o con barra final lanza Error sin incluir el valor', () => {
  const malos = ['ftp://oskar.example', 'https://oskar.example/', 'https://oskar.example/app', 'oskar.example', 'https://oskar.example?x=1', 'https://u:p@oskar.example'];
  for (const valor of malos) {
    for (const nodeEnv of ['development', 'production']) {
      assert.throws(() => leerConfigRecuperacion({ FRONTEND_URL: valor }, nodeEnv), (error) => {
        assert.match(error.message, /FRONTEND_URL inválida/);
        assert.equal(error.message.includes(valor), false);
        return true;
      });
    }
  }
});

test('config: constantes de vencimiento, enfriamiento y límites', () => {
  const c = leerConfigRecuperacion({}, 'test');
  assert.deepEqual(
    [c.vencimientoMinutos, c.enfriamientoMinutos, c.recuperarMax, c.restablecerMax, c.ventanaLimiteMs],
    [30, 2, 5, 10, 15 * 60 * 1000]
  );
});

test('sesionVigente: sin cambio registrado siempre vale; con cambio exige iat posterior (estricto)', () => {
  const cambio = new Date('2026-01-01T00:00:10.500Z');
  const segundos = (iso) => Math.floor(new Date(iso).getTime() / 1000);
  assert.equal(sesionVigente({ sub: 'x' }, null), true);
  assert.equal(sesionVigente({ iat: 1 }, undefined), true);
  assert.equal(sesionVigente({ iat: segundos('2026-01-01T00:00:09Z') }, cambio), false);
  assert.equal(sesionVigente({ iat: segundos('2026-01-01T00:00:10Z') }, cambio), false); // mismo segundo
  assert.equal(sesionVigente({ iat: segundos('2026-01-01T00:00:11Z') }, cambio), true);
  assert.equal(sesionVigente({ iat: segundos('2026-01-01T00:00:11Z') }, cambio.toISOString()), true);
  assert.equal(sesionVigente({}, cambio), false);
  assert.equal(sesionVigente({ iat: '9999999999' }, cambio), false);
  assert.equal(sesionVigente({ iat: 9999999999 }, 'no-es-fecha'), false);
});

test('token: 43 caracteres base64url, hash SHA-256 de 64 hexadecimales y enlace en el fragmento', () => {
  const token = generarToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(formatoValido(token), true);
  assert.notEqual(generarToken(), token);
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  for (const malo of [undefined, null, 42, '', `${token}A`, token.slice(1), `${token.slice(1)}=`, `${token.slice(1)}+`]) {
    assert.equal(formatoValido(malo), false);
  }
  assert.equal(enlaceRestablecer('https://oskar.example', token), `https://oskar.example/restablecer#token=${token}`);
});

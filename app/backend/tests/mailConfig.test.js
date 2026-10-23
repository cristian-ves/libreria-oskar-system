const { test } = require('node:test');
const assert = require('node:assert/strict');
const { leerConfigCorreo } = require('../src/config/mail.config');

test('NODE_ENV=test fuerza consola aunque se pida smtp', () => {
  const config = leerConfigCorreo({ MAIL_PROVIDER: 'smtp', MAIL_USER: 'a@b.co', MAIL_PASSWORD: 'x' }, 'test');
  assert.equal(config.proveedor, 'consola');
  assert.deepEqual(config.faltantes, []);
});

test('producción sin variables usa smtp, nombra faltantes y no lanza', () => {
  const config = leerConfigCorreo({}, 'production');
  assert.equal(config.proveedor, 'smtp');
  assert.deepEqual(config.faltantes, ['MAIL_USER', 'MAIL_PASSWORD']);
  assert.equal(config.host, 'smtp.gmail.com');
  assert.equal(config.port, 587);
});

test('fuera de producción el proveedor por defecto es consola y no exige credenciales', () => {
  const config = leerConfigCorreo({}, 'development');
  assert.equal(config.proveedor, 'consola');
  assert.deepEqual(config.faltantes, []);
});

test('acepta console como alias de consola', () => {
  assert.equal(leerConfigCorreo({ MAIL_PROVIDER: 'console' }, 'production').proveedor, 'consola');
});

test('MAIL_FROM cae a MAIL_USER y los valores explícitos se respetan', () => {
  const base = { MAIL_PROVIDER: 'smtp', MAIL_USER: 'tienda@gmail.com', MAIL_PASSWORD: 'p' };
  assert.equal(leerConfigCorreo(base, 'production').from, 'tienda@gmail.com');
  const config = leerConfigCorreo({ ...base, MAIL_FROM: 'no-responder@x.co', MAIL_HOST: 'h.test', MAIL_PORT: '465' }, 'production');
  assert.equal(config.from, 'no-responder@x.co');
  assert.equal(config.host, 'h.test');
  assert.equal(config.port, 465);
});

test('proveedor y puerto inválidos lanzan Error claro', () => {
  assert.throws(() => leerConfigCorreo({ MAIL_PROVIDER: 'brevo' }, 'development'), /MAIL_PROVIDER inválido/);
  for (const puerto of ['abc', '0', '70000', '58.7']) {
    assert.throws(() => leerConfigCorreo({ MAIL_PORT: puerto }, 'development'), /MAIL_PORT inválido/);
  }
});

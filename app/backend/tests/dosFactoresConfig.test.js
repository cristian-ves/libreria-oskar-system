const { test } = require('node:test');
const assert = require('node:assert/strict');
const { leerConfigDosFactores, CLAVE_DESARROLLO } = require('../src/config/twoFactor.config');

const CLAVE_VALIDA = 'ab'.repeat(32);

test('2FA config: valores por defecto fuera de producción (apagado, clave de desarrollo, constantes)', () => {
  const config = leerConfigDosFactores({}, 'development');
  assert.equal(config.enforced, false);
  assert.equal(config.claveDesarrollo, true);
  assert.ok(Buffer.isBuffer(config.encryptionKey));
  assert.equal(config.encryptionKey.length, 32);
  assert.equal(config.encryptionKey.toString('hex'), CLAVE_DESARROLLO);
  assert.equal(config.emisor, 'Librería Oskar');
  assert.equal(config.digitos, 6);
  assert.equal(config.periodoSegundos, 30);
  assert.equal(config.algoritmo, 'sha1');
  assert.equal(config.toleranciaPasos, 1);
  assert.equal(config.tokenTemporalSegundos, 600);
  assert.equal(config.maxIntentos, 5);
  assert.equal(config.bloqueoMinutos, 15);
  assert.equal(config.codigosRespaldo, 10);
});

test('2FA config: en producción es obligatorio por defecto y usa la clave dada', () => {
  const config = leerConfigDosFactores({ TWO_FACTOR_ENCRYPTION_KEY: CLAVE_VALIDA }, 'production');
  assert.equal(config.enforced, true);
  assert.equal(config.claveDesarrollo, false);
  assert.equal(config.encryptionKey.toString('hex'), CLAVE_VALIDA);
  assert.equal(
    leerConfigDosFactores({ TWO_FACTOR_ENCRYPTION_KEY: CLAVE_VALIDA, TWO_FACTOR_ENFORCED: 'false' }, 'production').enforced,
    false
  );
  assert.equal(leerConfigDosFactores({ TWO_FACTOR_ENFORCED: 'TRUE' }, 'development').enforced, true);
});

test('2FA config: NODE_ENV=test fuerza enforced=false aunque se pida true', () => {
  const config = leerConfigDosFactores({ TWO_FACTOR_ENFORCED: 'true', TWO_FACTOR_ENCRYPTION_KEY: CLAVE_VALIDA }, 'test');
  assert.equal(config.enforced, false);
  // Ni siquiera un valor inválido se evalúa en pruebas.
  assert.equal(leerConfigDosFactores({ TWO_FACTOR_ENFORCED: 'quizas' }, 'test').enforced, false);
});

test('2FA config: producción sin clave lanza Error claro', () => {
  assert.throws(() => leerConfigDosFactores({}, 'production'), /TWO_FACTOR_ENCRYPTION_KEY es obligatoria/);
  assert.throws(() => leerConfigDosFactores({ TWO_FACTOR_ENCRYPTION_KEY: '   ' }, 'production'), /obligatoria/);
});

test('2FA config: clave con formato inválido lanza Error sin incluir el valor', () => {
  const invalidas = [
    'abc',
    'a'.repeat(63),
    'a'.repeat(65),
    'g'.repeat(64),
    Buffer.alloc(32, 7).toString('base64'),
  ];
  for (const clave of invalidas) {
    for (const nodeEnv of ['development', 'production']) {
      assert.throws(
        () => leerConfigDosFactores({ TWO_FACTOR_ENCRYPTION_KEY: clave }, nodeEnv),
        (error) => /64 caracteres hexadecimales/.test(error.message) && !error.message.includes(clave)
      );
    }
  }
});

test('2FA config: TWO_FACTOR_ENFORCED con valor inválido lanza Error', () => {
  assert.throws(() => leerConfigDosFactores({ TWO_FACTOR_ENFORCED: 'si' }, 'development'), /TWO_FACTOR_ENFORCED inválido/);
});

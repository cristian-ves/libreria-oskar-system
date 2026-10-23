const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { generateSync } = require('otplib');
const appEnv = require('../src/config/env');
const { cifrar, descifrar, ErrorDescifrado } = require('../src/services/dosFactores/cifrado');
const totp = require('../src/services/dosFactores/totp');
const respaldo = require('../src/services/dosFactores/respaldo');

const USUARIO = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
const OTRO_USUARIO = '0b9f8f1e-3c55-4d43-9d6f-2f6f0c4f5e11';
const CLAVE_OTRA = Buffer.alloc(32, 9);
const esErrorDescifrado = (error) => error instanceof ErrorDescifrado && !/[A-Z2-7]{32}/.test(error.message);

test('cifrado: ida y vuelta con formato v1 de 4 partes', () => {
  const secreto = totp.generarSecreto();
  const valor = cifrar(secreto, USUARIO);
  assert.match(valor, /^v1:[\w-]{16}:[\w-]{22}:[\w-]+$/);
  assert.ok(!valor.includes(secreto));
  assert.equal(descifrar(valor, USUARIO), secreto);
});

test('cifrado: dos cifrados del mismo texto usan IV distinto', () => {
  const secreto = totp.generarSecreto();
  const a = cifrar(secreto, USUARIO);
  const b = cifrar(secreto, USUARIO);
  assert.notEqual(a, b);
  assert.notEqual(a.split(':')[1], b.split(':')[1]);
});

test('cifrado: texto, IV o etiqueta manipulados → error (falla cerrada)', () => {
  const valor = cifrar(totp.generarSecreto(), USUARIO);
  const partes = valor.split(':');
  for (const indice of [1, 2, 3]) {
    const copia = [...partes];
    const bytes = Buffer.from(copia[indice], 'base64url');
    bytes[0] ^= 0x01;
    copia[indice] = bytes.toString('base64url');
    assert.throws(() => descifrar(copia.join(':'), USUARIO), esErrorDescifrado);
  }
});

test('cifrado: clave equivocada, otro usuario (AAD), versión o formato inválidos → error', () => {
  const valor = cifrar(totp.generarSecreto(), USUARIO);
  assert.throws(() => descifrar(valor, USUARIO, CLAVE_OTRA), esErrorDescifrado);
  assert.throws(() => descifrar(valor, OTRO_USUARIO), esErrorDescifrado);
  assert.throws(() => descifrar(valor.replace(/^v1/, 'v2'), USUARIO), esErrorDescifrado);
  for (const malo of [null, undefined, '', 'v1:abc', 'JBSWY3DPEHPK3PXP', 'v1:::', 42]) {
    assert.throws(() => descifrar(malo, USUARIO), esErrorDescifrado);
  }
});

test('cifrado: el resultado cabe en dos_factores_secreto VARCHAR(128)', () => {
  for (let i = 0; i < 50; i += 1) {
    assert.ok(cifrar(totp.generarSecreto(), USUARIO).length <= 128);
  }
  assert.equal(cifrar(totp.generarSecreto(), USUARIO).length, 86);
});

test('TOTP: tolerancia de ±1 paso, devuelve el paso coincidente y rechaza ±2', () => {
  const secreto = totp.generarSecreto();
  const epoch = 1_800_000_015;
  const paso = Math.floor(epoch / 30);
  const codigo = (d) => generateSync({ secret: secreto, epoch: (paso + d) * 30 });
  for (const d of [-1, 0, 1]) {
    assert.equal(totp.verificarCodigo(secreto, codigo(d), epoch), paso + d);
  }
  for (const d of [-2, 2]) {
    const c = codigo(d);
    if (![-1, 0, 1].some((x) => codigo(x) === c)) assert.equal(totp.verificarCodigo(secreto, c, epoch), null);
  }
});

test('TOTP: formato del código, URI otpauth y QR PNG', async () => {
  assert.equal(totp.normalizarCodigo(' 123 456 '), '123456');
  for (const malo of ['12345', '1234567', '12a456', 123456, null]) assert.equal(totp.normalizarCodigo(malo), null);

  const secreto = totp.generarSecreto();
  assert.match(secreto, /^[A-Z2-7]{32}$/);
  const uri = totp.construirUri(secreto, 'ana@example.test');
  assert.ok(uri.startsWith('otpauth://totp/Librer%C3%ADa%20Oskar:ana%40example.test?'));
  assert.ok(uri.includes(`secret=${secreto}`));
  assert.ok(uri.includes('issuer=Librer%C3%ADa%20Oskar'));
  assert.ok((await totp.generarQr(uri)).startsWith('data:image/png;base64,'));
});

test('respaldo: 10 códigos XXXXX-XXXXX distintos, sin caracteres ambiguos', () => {
  assert.equal(respaldo.ALFABETO.length, 31);
  assert.doesNotMatch(respaldo.ALFABETO, /[0O1IL]/);
  const codigos = respaldo.generarCodigos();
  assert.equal(codigos.length, appEnv.twoFactor.codigosRespaldo);
  assert.equal(new Set(codigos).size, codigos.length);
  for (const c of codigos) assert.match(c, /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
});

test('respaldo: normalización y rechazo de formato inválido', () => {
  assert.equal(respaldo.normalizar('abcde-fghjk'), 'ABCDEFGHJK');
  assert.equal(respaldo.normalizar(' AbCdE FgHjK '), 'ABCDEFGHJK');
  for (const malo of ['ABCDE-FGHJ', 'ABCDE-FGHJKM', 'ABCDE-FGHJ0', 'OBCDE-FGHJK', 'ABCDE-FGHJ1', 'ABCDE-FGHJL', 'ABCDE-FGHJI', 12345, null]) {
    assert.equal(respaldo.normalizar(malo), null);
  }
});

test('respaldo: HMAC con subclave derivada, ligado al usuario y a la clave del servidor', () => {
  const h = respaldo.hashCodigo(USUARIO, 'ABCDEFGHJK');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(respaldo.hashCodigo(USUARIO, 'ABCDEFGHJK'), h);
  assert.notEqual(respaldo.hashCodigo(OTRO_USUARIO, 'ABCDEFGHJK'), h);
  assert.notEqual(respaldo.hashCodigo(USUARIO, 'ABCDEFGHJK', CLAVE_OTRA), h);
  // No es un hash sin clave ni un HMAC con la clave maestra cruda.
  const mensaje = `${USUARIO}:ABCDEFGHJK`;
  assert.notEqual(crypto.createHash('sha256').update(mensaje).digest('hex'), h);
  assert.notEqual(crypto.createHmac('sha256', appEnv.twoFactor.encryptionKey).update(mensaje).digest('hex'), h);
});

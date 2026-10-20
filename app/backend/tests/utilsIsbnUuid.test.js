const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizarIsbn,
  normalizarIsbnEstricto,
  hasValidIsbnChecksum,
} = require('../src/utils/isbn');
const { esUuid, UUID_REGEX } = require('../src/utils/uuid');

// ── normalizarIsbn (versión tolerante) ──────────────────────────────────────────

test('normalizarIsbn - devuelve cadena vacía ante valores falsy (null, undefined, vacíos y 0)', () => {
  assert.equal(normalizarIsbn(null), '');
  assert.equal(normalizarIsbn(undefined), '');
  assert.equal(normalizarIsbn(''), '');
  // Comportamiento fijado: 'if (!isbn) return \'\'' evalúa 0 como falsy y devuelve ''
  assert.equal(normalizarIsbn(0), '');
});

test('normalizarIsbn - números enteros se convierten a cadena y se normalizan', () => {
  assert.equal(normalizarIsbn(9780135957059), '9780135957059');
});

test('normalizarIsbn - elimina guiones, espacios, tabs y saltos de línea de los extremos y del interior', () => {
  assert.equal(normalizarIsbn('978-0-13-595705-9'), '9780135957059');
  assert.equal(normalizarIsbn(' 978 0 13 595705 9 '), '9780135957059');
  assert.equal(normalizarIsbn('\t978-0-13\n595705-9\r\n'), '9780135957059');
  assert.equal(normalizarIsbn('---  978-0-13-595705-9  ---'), '9780135957059');
  assert.equal(normalizarIsbn('0-13-235088-2'), '0132350882');
});

// ── normalizarIsbnEstricto ───────────────────────────────────────────────────

test('normalizarIsbnEstricto - lanza TypeError si el argumento es null, undefined o número', () => {
  assert.throws(() => normalizarIsbnEstricto(null), TypeError);
  assert.throws(() => normalizarIsbnEstricto(undefined), TypeError);
  assert.throws(() => normalizarIsbnEstricto(0), TypeError);
  assert.throws(() => normalizarIsbnEstricto(9780135957059), TypeError);
});

test('normalizarIsbnEstricto - normaliza cadenas válidas idénticamente a la versión tolerante', () => {
  assert.equal(normalizarIsbnEstricto(''), '');
  assert.equal(normalizarIsbnEstricto('978-0-13-595705-9'), '9780135957059');
  assert.equal(normalizarIsbnEstricto(' 978 0 13 595705 9 '), '9780135957059');
  assert.equal(normalizarIsbnEstricto('\t978-0-13\n595705-9\r\n'), '9780135957059');
  assert.equal(normalizarIsbnEstricto('---  978-0-13-595705-9  ---'), '9780135957059');
});

// ── hasValidIsbnChecksum (ISBN-13) ───────────────────────────────────────────

test('hasValidIsbnChecksum - valida ISBN-13 correctos con cálculo manual de dígito verificador', () => {
  // Cálculo manual ISBN-13 (9780135957059):
  // Suma = 9*1 + 7*3 + 8*1 + 0*3 + 1*1 + 3*3 + 5*1 + 9*3 + 5*1 + 7*3 + 0*1 + 5*3
  //      = 9 + 21 + 8 + 0 + 1 + 9 + 5 + 27 + 5 + 21 + 0 + 15 = 121
  // Dígito = (10 - (121 % 10)) % 10 = (10 - 1) % 10 = 9 -> Coincide con el último dígito (9)
  assert.equal(hasValidIsbnChecksum('9780135957059'), true);

  // Cálculo manual ISBN-13 con dígito verificador 0 (9780306406140):
  // Suma = 9*1 + 7*3 + 8*1 + 0*3 + 3*1 + 0*3 + 6*1 + 4*3 + 0*1 + 6*3 + 1*1 + 4*3
  //      = 9 + 21 + 8 + 0 + 3 + 0 + 6 + 12 + 0 + 18 + 1 + 12 = 90
  // Dígito = (10 - (90 % 10)) % 10 = (10 - 0) % 10 = 0 -> Coincide con el último dígito (0)
  assert.equal(hasValidIsbnChecksum('9780306406140'), true);
});

test('hasValidIsbnChecksum - rechaza ISBN-13 con dígito incorrecto, letras o X', () => {
  // 9780135957058 tiene suma 121, dígito esperado 9, pero termina en 8
  assert.equal(hasValidIsbnChecksum('9780135957058'), false);
  // 'X' solo está permitido en ISBN-10, en ISBN-13 debe dar false
  assert.equal(hasValidIsbnChecksum('978013595705X'), false);
  assert.equal(hasValidIsbnChecksum('978013595705x'), false);
  assert.equal(hasValidIsbnChecksum('978013595705A'), false);
});

// ── hasValidIsbnChecksum (ISBN-10) ───────────────────────────────────────────

test('hasValidIsbnChecksum - valida ISBN-10 correctos (numéricos y con X / x)', () => {
  // Cálculo manual ISBN-10 numérico (0132350882):
  // Suma = 0*10 + 1*9 + 3*8 + 2*7 + 3*6 + 5*5 + 0*4 + 8*3 + 8*2 + 2*1
  //      = 0 + 9 + 24 + 14 + 18 + 25 + 0 + 24 + 16 + 2 = 132
  // Módulo = 132 % 11 = 0 -> Válido
  assert.equal(hasValidIsbnChecksum('0132350882'), true);

  // Cálculo manual ISBN-10 con X=10 (080442957X):
  // Suma = 0*10 + 8*9 + 0*8 + 4*7 + 4*6 + 2*5 + 9*4 + 5*3 + 7*2 + 10*1
  //      = 0 + 72 + 0 + 28 + 24 + 10 + 36 + 15 + 14 + 10 = 209
  // Módulo = 209 % 11 = 0 -> Válido
  assert.equal(hasValidIsbnChecksum('080442957X'), true);

  // Misma validación con 'x' minúscula (la regex usa flag /i y normaliza a 'X')
  assert.equal(hasValidIsbnChecksum('080442957x'), true);
});

test('hasValidIsbnChecksum - rechaza ISBN-10 con dígito incorrecto, X intermedia o letras inválidas', () => {
  // Suma de 0132350883 = 133; 133 % 11 = 1 !== 0
  assert.equal(hasValidIsbnChecksum('0132350883'), false);
  // Suma de 0804429579 = 208; 208 % 11 = 10 !== 0
  assert.equal(hasValidIsbnChecksum('0804429579'), false);
  // 'X' en posición intermedia no está permitida (solo en posición 10)
  assert.equal(hasValidIsbnChecksum('01323X0882'), false);
  assert.equal(hasValidIsbnChecksum('013235088A'), false);
});

test('hasValidIsbnChecksum - rechaza entradas no normalizadas, longitudes erróneas o tipos no string', () => {
  // Requiere entrada ya normalizada (sin guiones ni espacios)
  assert.equal(hasValidIsbnChecksum('978-0-13-595705-9'), false);
  assert.equal(hasValidIsbnChecksum('0-13-235088-2'), false);
  assert.equal(hasValidIsbnChecksum(''), false);
  assert.equal(hasValidIsbnChecksum('12345'), false);
  assert.equal(hasValidIsbnChecksum('12345678901'), false);
  assert.equal(hasValidIsbnChecksum('12345678901234'), false);
  assert.equal(hasValidIsbnChecksum(null), false);
  assert.equal(hasValidIsbnChecksum(undefined), false);
});

// ── UUID_REGEX y esUuid ──────────────────────────────────────────────────────

test('esUuid y UUID_REGEX - aceptan UUID válidos v1, v3, v4, v5 en minúsculas y mayúsculas', () => {
  const v4Lower = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
  const v4Upper = '5A215402-F1FB-45A2-B20C-A5816E0445A0';
  const v1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const v3 = '6ba7b811-9dad-31d1-80b4-00c04fd430c8';
  const v5 = '6ba7b812-9dad-51d1-80b4-00c04fd430c8';

  for (const uuid of [v4Lower, v4Upper, v1, v3, v5]) {
    assert.equal(esUuid(uuid), true);
    assert.equal(UUID_REGEX.test(uuid), true);
  }
});

test('esUuid y UUID_REGEX - rechazan versiones fuera del rango 1 a 5', () => {
  const v0 = '5a215402-f1fb-05a2-b20c-a5816e0445a0'; // versión 0
  const v6 = '5a215402-f1fb-65a2-b20c-a5816e0445a0'; // versión 6
  assert.equal(esUuid(v0), false);
  assert.equal(esUuid(v6), false);
  assert.equal(UUID_REGEX.test(v0), false);
  assert.equal(UUID_REGEX.test(v6), false);
});

test('esUuid y UUID_REGEX - rechazan variantes fuera de [89ab]', () => {
  const var0 = '5a215402-f1fb-45a2-020c-a5816e0445a0'; // variante 0
  const var7 = '5a215402-f1fb-45a2-720c-a5816e0445a0'; // variante 7
  const varC = '5a215402-f1fb-45a2-c20c-a5816e0445a0'; // variante c
  assert.equal(esUuid(var0), false);
  assert.equal(esUuid(var7), false);
  assert.equal(esUuid(varC), false);
});

test('esUuid y UUID_REGEX - rechazan cadenas sin guiones, caracteres extra, no hexadecimales y no-strings', () => {
  const sinGuiones = '5a215402f1fb45a2b20ca5816e0445a0';
  const conEspacioInicio = ' 5a215402-f1fb-45a2-b20c-a5816e0445a0';
  const conEspacioFinal = '5a215402-f1fb-45a2-b20c-a5816e0445a0 ';
  const longitudExtra = '5a215402-f1fb-45a2-b20c-a5816e0445a01';
  const noHex = '5a215402-f1fb-45a2-b20c-a5816e0445ag';

  for (const invalido of [sinGuiones, conEspacioInicio, conEspacioFinal, longitudExtra, noHex]) {
    assert.equal(esUuid(invalido), false);
    assert.equal(UUID_REGEX.test(invalido), false);
  }

  // Tipos no string y vacíos
  assert.equal(esUuid(''), false);
  assert.equal(esUuid(null), false);
  assert.equal(esUuid(undefined), false);
  assert.equal(esUuid(12345), false);
  assert.equal(esUuid({}), false);
});

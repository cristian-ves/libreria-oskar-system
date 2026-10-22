const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CENTAVOS, aCentavos, deCentavos, subtotalLinea, codigoVenta, rangoFechasNegocio,
} = require('../src/utils/ventas');
const { ValidationError } = require('../src/utils/errors');

test('aCentavos convierte números y cadenas sin errores de coma flotante', () => {
  assert.equal(aCentavos('85.50'), 8550);
  assert.equal(aCentavos(85.5), 8550);
  assert.equal(aCentavos('0'), 0);
  assert.equal(aCentavos(' 10 '), 1000);
  assert.equal(aCentavos('0.1'), 10);
  assert.equal(aCentavos('19.99'), 1999);
  assert.equal(aCentavos(1.15), 115);
  assert.equal(aCentavos('99999999.99'), MAX_CENTAVOS);
  assert.equal(MAX_CENTAVOS, 9999999999);
});

test('aCentavos rechaza más de 2 decimales, negativos y valores no finitos', () => {
  for (const malo of ['1.234', 0.001, -1, '-0.50', NaN, Infinity, -Infinity, '', 'abc', '1e3', 1e21,
    null, undefined, {}, [], '1,5', '.5', '5.', 0.1 + 0.2]) {
    assert.throws(() => aCentavos(malo), ValidationError, `debe rechazar ${String(malo)}`);
  }
  assert.throws(() => aCentavos('9'.repeat(30)), ValidationError);
});

test('deCentavos formatea con 2 decimales y rechaza valores inválidos', () => {
  assert.equal(deCentavos(8550), '85.50');
  assert.equal(deCentavos(0), '0.00');
  assert.equal(deCentavos(5), '0.05');
  assert.equal(deCentavos(100), '1.00');
  assert.equal(deCentavos(MAX_CENTAVOS), '99999999.99');
  for (const malo of [-1, 1.5, NaN, '10', null]) {
    assert.throws(() => deCentavos(malo), ValidationError);
  }
});

test('Ida y vuelta aCentavos/deCentavos es exacta', () => {
  for (const valor of ['0.01', '0.10', '1.00', '12345.67', '99999999.99']) {
    assert.equal(deCentavos(aCentavos(valor)), valor);
  }
});

test('subtotalLinea multiplica en enteros y rechaza el desbordamiento de NUMERIC(10,2)', () => {
  assert.equal(subtotalLinea(1999, 3), 5997);
  assert.equal(subtotalLinea(MAX_CENTAVOS, 1), MAX_CENTAVOS);
  assert.throws(() => subtotalLinea(MAX_CENTAVOS, 2), ValidationError);
  assert.throws(() => subtotalLinea(100, 2147483647), ValidationError);
  assert.throws(() => subtotalLinea(MAX_CENTAVOS, 2147483647), ValidationError);
});

test('codigoVenta rellena a 6 dígitos y no trunca números grandes', () => {
  assert.equal(codigoVenta(123), 'V-000123');
  assert.equal(codigoVenta(1), 'V-000001');
  assert.equal(codigoVenta('45'), 'V-000045');
  assert.equal(codigoVenta(1234567), 'V-1234567');
});

test('rangoFechasNegocio usa días inclusivos de Guatemala (UTC-6 fijo)', () => {
  const { inicio, finExclusivo } = rangoFechasNegocio('2026-03-14', '2026-03-14');
  assert.equal(inicio.toISOString(), '2026-03-14T06:00:00.000Z');
  assert.equal(finExclusivo.toISOString(), '2026-03-15T06:00:00.000Z');

  const amplio = rangoFechasNegocio('2026-12-31', '2026-12-31');
  assert.equal(amplio.finExclusivo.toISOString(), '2027-01-01T06:00:00.000Z');

  const bisiesto = rangoFechasNegocio('2028-02-29', '2028-02-29');
  assert.equal(bisiesto.finExclusivo.toISOString(), '2028-03-01T06:00:00.000Z');
});

test('rangoFechasNegocio acepta extremos ausentes', () => {
  assert.deepEqual(rangoFechasNegocio(), { inicio: null, finExclusivo: null });
  assert.equal(rangoFechasNegocio('2026-03-14', '').finExclusivo, null);
  assert.equal(rangoFechasNegocio(undefined, '2026-03-14').inicio, null);
});

test('rangoFechasNegocio rechaza fechas inexistentes, mal formadas y desde > hasta', () => {
  for (const mala of ['2026-02-30', '2026-13-01', '2026-00-10', '2027-02-29', '2026-3-4', '14/03/2026', 'hoy', 20260314, ['2026-03-14']]) {
    assert.throws(() => rangoFechasNegocio(mala, null), ValidationError, `desde ${String(mala)}`);
    assert.throws(() => rangoFechasNegocio(null, mala), ValidationError, `hasta ${String(mala)}`);
  }
  assert.throws(() => rangoFechasNegocio('2026-03-15', '2026-03-14'), ValidationError);
});

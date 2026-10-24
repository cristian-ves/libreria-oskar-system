const { aCentavos, deCentavos } = require('../../utils/ventas');

function normalizarImporte(valor) { return deCentavos(aCentavos(valor == null ? '0' : String(valor))); }
function centavos(valor) { return aCentavos(valor == null ? '0' : String(valor)); }
function variacion(actual, anterior) {
  if (anterior === 0) return actual === 0 ? '0.00' : null;
  const numerador = BigInt(actual - anterior) * 10000n;
  const denominador = BigInt(anterior);
  const redondeado = (numerador >= 0n ? numerador + denominador / 2n : numerador - denominador / 2n) / denominador;
  const negativo = redondeado < 0n;
  const absoluto = negativo ? -redondeado : redondeado;
  return `${negativo ? '-' : ''}${absoluto / 100n}.${String(absoluto % 100n).padStart(2, '0')}`;
}

module.exports = { centavos, normalizarImporte, variacion };

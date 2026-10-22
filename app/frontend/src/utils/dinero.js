// Importes en centavos enteros: nunca punto flotante.
const PATRON_MONTO = /^\d+(\.\d{1,2})?$/;

export function aCentavos(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!PATRON_MONTO.test(texto)) return null;
  const [entero, decimales = ''] = texto.split('.');
  return Number(entero) * 100 + Number(decimales.padEnd(2, '0'));
}

export function deCentavos(centavos) {
  const quetzales = Math.trunc(centavos / 100);
  const resto = String(centavos % 100).padStart(2, '0');
  return `${quetzales}.${resto}`;
}

export function formatQuetzales(centavos) {
  return `Q ${deCentavos(centavos)}`;
}

export function formatMonto(texto) {
  return formatQuetzales(aCentavos(texto) ?? 0);
}

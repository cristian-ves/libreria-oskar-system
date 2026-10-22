const { ValidationError } = require('./errors');

// Máximo de NUMERIC(10,2) (99999999.99) expresado en centavos.
const MAX_CENTAVOS = 9999999999;

// Guatemala no usa horario de verano: el desplazamiento respecto a UTC es fijo.
const OFFSET_GUATEMALA_HORAS = 6;
const OFFSET_GUATEMALA = '-06:00';

const IMPORTE_REGEX = /^\d+(\.\d{1,2})?$/;
const DIA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_HORA = 3600000;

/**
 * Convierte un importe (número o cadena numérica) a centavos enteros sin aritmética de coma flotante.
 * Rechaza negativos, más de 2 decimales, notación científica y valores no finitos.
 * @param {number|string} valor
 * @returns {number}
 */
function aCentavos(valor) {
  const texto = typeof valor === 'number' && Number.isFinite(valor)
    ? String(valor)
    : typeof valor === 'string' ? valor.trim() : '';

  if (!IMPORTE_REGEX.test(texto)) {
    throw new ValidationError('El importe debe ser un número no negativo con máximo 2 decimales.');
  }

  const [enteros, decimales = ''] = texto.split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos)) {
    throw new ValidationError('El importe es demasiado grande.');
  }
  return centavos;
}

/**
 * Convierte centavos enteros a una cadena con 2 decimales ("85.50").
 * @param {number} centavos
 * @returns {string}
 */
function deCentavos(centavos) {
  if (!Number.isSafeInteger(centavos) || centavos < 0) {
    throw new ValidationError('El importe en centavos debe ser un entero no negativo.');
  }
  const decimales = String(centavos % 100).padStart(2, '0');
  return `${Math.floor(centavos / 100)}.${decimales}`;
}

/**
 * Subtotal de una línea en centavos; rechaza el desbordamiento de NUMERIC(10,2)
 * antes de multiplicar para que el producto sea siempre exacto.
 * @param {number} precioCentavos
 * @param {number} cantidad
 * @returns {number}
 */
function subtotalLinea(precioCentavos, cantidad) {
  if (precioCentavos > 0 && cantidad > Math.floor(MAX_CENTAVOS / precioCentavos)) {
    throw new ValidationError('El subtotal de la venta excede el máximo permitido (99999999.99).');
  }
  return precioCentavos * cantidad;
}

/**
 * Código legible de una venta: "V-000123".
 * @param {number|string} numero
 * @returns {string}
 */
function codigoVenta(numero) {
  return `V-${String(numero).padStart(6, '0')}`;
}

/**
 * Valida un día "YYYY-MM-DD" real y devuelve su medianoche UTC en milisegundos, o null.
 * @param {any} dia
 * @returns {number|null}
 */
function medianocheUtc(dia) {
  const partes = typeof dia === 'string' ? DIA_REGEX.exec(dia) : null;
  if (!partes) return null;
  const [anio, mes, diaMes] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  if (anio < 1900) return null;
  const ms = Date.UTC(anio, mes - 1, diaMes);
  const fecha = new Date(ms);
  const coincide = fecha.getUTCFullYear() === anio
    && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === diaMes;
  return coincide ? ms : null;
}

/**
 * Rango [inicio, finExclusivo) en UTC para días inclusivos de hora de Guatemala.
 * Cualquiera de los extremos puede ser null/undefined/''. Lanza ValidationError si es inválido.
 * @param {string|null} [desde]
 * @param {string|null} [hasta]
 * @returns {{ inicio: Date|null, finExclusivo: Date|null }}
 */
function rangoFechasNegocio(desde, hasta) {
  const vacio = (v) => v === undefined || v === null || v === '';
  const msDesde = vacio(desde) ? null : medianocheUtc(desde);
  const msHasta = vacio(hasta) ? null : medianocheUtc(hasta);

  if (!vacio(desde) && msDesde === null) {
    throw new ValidationError('El parámetro "desde" debe ser una fecha real con formato YYYY-MM-DD.');
  }
  if (!vacio(hasta) && msHasta === null) {
    throw new ValidationError('El parámetro "hasta" debe ser una fecha real con formato YYYY-MM-DD.');
  }
  if (msDesde !== null && msHasta !== null && msDesde > msHasta) {
    throw new ValidationError('El parámetro "desde" no puede ser posterior a "hasta".');
  }

  const desplazamiento = OFFSET_GUATEMALA_HORAS * MS_POR_HORA;
  const dia = 24 * MS_POR_HORA;
  return {
    inicio: msDesde === null ? null : new Date(msDesde + desplazamiento),
    finExclusivo: msHasta === null ? null : new Date(msHasta + dia + desplazamiento),
  };
}

module.exports = {
  MAX_CENTAVOS,
  OFFSET_GUATEMALA,
  aCentavos,
  deCentavos,
  subtotalLinea,
  codigoVenta,
  rangoFechasNegocio,
};

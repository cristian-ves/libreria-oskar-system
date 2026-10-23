// Utilidades puras del 2FA (sin React): se pueden ejercitar con node.
import { formatFechaVenta } from '../../utils/formatters.js';

const LONGITUD_TOTP = 6;
const LONGITUD_RESPALDO = 10;

/** Deja solo dígitos y corta a 6. */
export function limpiarCodigoTotp(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, LONGITUD_TOTP);
}

/** Mayúsculas, solo letras y dígitos, máximo 10, con guion tras el quinto: XXXXX-XXXXX. */
export function formatearCodigoRespaldo(valor) {
  const limpio = String(valor ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LONGITUD_RESPALDO);
  return limpio.length > 5 ? `${limpio.slice(0, 5)}-${limpio.slice(5)}` : limpio;
}

export function totpCompleto(valor) {
  return /^\d{6}$/.test(String(valor ?? ''));
}

export function respaldoCompleto(valor) {
  return /^[A-Z0-9]{10}$/i.test(String(valor ?? '').replace(/-/g, ''));
}

/** Agrupa la clave base32 en bloques de 4 para leerla. */
export function agruparClave(clave) {
  const limpia = String(clave ?? '').replace(/\s/g, '');
  return (limpia.match(/.{1,4}/g) || []).join(' ');
}

/** Contenido del .txt de códigos de respaldo. */
export function textoArchivoCodigos({ email, codigos, fecha }) {
  return [
    'Librería Oskar - Códigos de respaldo',
    `Cuenta: ${email || '—'}`,
    `Generados: ${formatFechaVenta(fecha)} (hora de Guatemala)`,
    '',
    ...(codigos || []),
    '',
    'Guárdalos en un lugar seguro. Cada código sirve una sola vez.',
    'Úsalos para entrar si no tienes tu app de autenticación.',
    '',
  ].join('\n');
}

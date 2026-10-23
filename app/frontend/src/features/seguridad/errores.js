// Clasificación pura (sin React) de los errores al enviar un código 2FA: se puede ejercitar con node.

// Depende del texto exacto del backend (MENSAJE_INVALIDO en backend/src/services/dosFactores/intentos.js):
// si cambia allí, un código inválido se tratará como 'sesionTerminada' (lo seguro).
export const MENSAJE_CODIGO_INVALIDO = 'Código inválido o vencido.';

/**
 * @param {'verificar'|'activar'|'regenerar'} contexto pantalla que envió el código
 * @returns {'invalido'|'bloqueado'|'sesionTerminada'|'otro'}
 *   'invalido': el campo se deshabilita hasta pulsar "Intentar de nuevo".
 *   'bloqueado': 429, todo deshabilitado y sin reintento.
 *   'sesionTerminada': otro 401 con token temporal (el flujo terminó).
 */
export function clasificarErrorCodigo(contexto, status, message) {
  if (status === 429) return 'bloqueado';
  // Con sesión completa el backend responde 400 (no 401) al código inválido, a propósito
  if (contexto === 'regenerar') return status === 400 ? 'invalido' : 'otro';
  if (status === 401) return message === MENSAJE_CODIGO_INVALIDO ? 'invalido' : 'sesionTerminada';
  return 'otro';
}

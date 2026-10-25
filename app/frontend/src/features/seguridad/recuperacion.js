// Utilidades puras de la recuperación de contraseña (sin React ni alias): se pueden ejercitar con node.

// Dependen del texto exacto del backend (backend/src/services/recuperacion.service.js): si cambia
// allí, un enlace terminal se tratará como error de contraseña ('password') y el usuario reintentará.
export const MENSAJE_ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
export const MENSAJE_MISMA_PASSWORD = 'La nueva contraseña debe ser distinta de la actual.';

const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const MAX_BYTES_PASSWORD = 72;

/** Token de `#token=...` (admite otros parámetros) o null si falta o no tiene el formato de 43 caracteres. */
export function extraerTokenDelHash(hash) {
  const texto = String(hash ?? '').replace(/^#/, '');
  const token = new URLSearchParams(texto).get('token');
  return token && FORMATO_TOKEN.test(token) ? token : null;
}

/** null si es válida; si no, el mensaje (misma regla y orden que backend/src/utils/passwordPolicy.js). */
export function validarPasswordNueva(password, confirmacion) {
  if (typeof password !== 'string' || password.length === 0) return 'La contraseña es obligatoria.';
  if (Array.from(password).length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (!/\p{L}/u.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\p{N}/u.test(password)) return 'La contraseña debe incluir al menos un número.';
  if (new TextEncoder().encode(password).length > MAX_BYTES_PASSWORD) {
    return 'La contraseña no puede superar 72 bytes en UTF-8.';
  }
  if (password !== confirmacion) return 'Las contraseñas no coinciden.';
  return null;
}

/**
 * @returns {'enlaceInvalido'|'password'|'limite'|'otro'}
 *   'enlaceInvalido': 400 terminal, el enlace ya no sirve.
 *   'password': otro 400 (política o misma contraseña); el enlace sigue vigente.
 *   'limite': 429; el formulario sigue usable (recargar perdería el token).
 */
export function clasificarErrorRestablecer(status, message) {
  if (status === 429) return 'limite';
  if (status === 400) return message === MENSAJE_ENLACE_INVALIDO ? 'enlaceInvalido' : 'password';
  return 'otro';
}

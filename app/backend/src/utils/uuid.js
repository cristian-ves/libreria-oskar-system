/**
 * Expresión regular canónica para validar identificadores UUID v1 a v5 según RFC 4122.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Evalúa si un valor cumple con el formato canónico de UUID (v1-v5).
 * Equivalente a UUID_REGEX.test(valor), sin protecciones adicionales.
 *
 * @param {any} valor
 * @returns {boolean}
 */
function esUuid(valor) {
  return UUID_REGEX.test(valor);
}

module.exports = {
  UUID_REGEX,
  esUuid,
};

/**
 * Utilidades para generación y parseo de identificadores y slugs amigables (refs).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHORT_ID_REGEX = /(?:^|-)([0-9a-fA-F]{12})$/;

/**
 * Convierte un texto en un slug URL-friendly:
 * - Normaliza con NFD y elimina diacríticos
 * - Convierte a minúsculas
 * - Reemplaza caracteres no alfanuméricos por guiones
 * - Colapsa guiones repetidos y recorta extremos
 * - Limita a 60 caracteres (recortando guiones finales tras el corte)
 * - Devuelve 'libro' si el resultado queda vacío
 *
 * @param {string} texto
 * @returns {string}
 */
function slugify(texto) {
  if (!texto || typeof texto !== 'string') {
    return 'libro';
  }

  const clean = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

  return clean || 'libro';
}

/**
 * Extrae los primeros 12 caracteres hexadecimales de un UUID sin guiones.
 *
 * @param {string} uuid
 * @returns {string}
 */
function shortId(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return '';
  }
  return uuid.replace(/-/g, '').slice(0, 12).toLowerCase();
}

/**
 * Construye la referencia pública amigable para un libro: `${slug}-${shortId}`
 *
 * @param {{ id: string, titulo: string }} libro
 * @returns {string}
 */
function buildRef(libro) {
  if (!libro) {
    return 'libro';
  }
  const slug = slugify(libro.titulo || '');
  const idShort = shortId(libro.id || '');
  return idShort ? `${slug}-${idShort}` : slug;
}

/**
 * Parsea una referencia o ID de ruta:
 * - Si es un UUID completo válido, devuelve `{ id }`.
 * - Si coincide con un shortId de 12 caracteres hex al final (precedido de inicio o guion), devuelve `{ shortId }` en minúsculas.
 * - En cualquier otro caso devuelve `null`.
 *
 * @param {string} ref
 * @returns {{ id: string } | { shortId: string } | null}
 */
function parseRef(ref) {
  if (!ref || typeof ref !== 'string') {
    return null;
  }

  const trimmed = ref.trim();
  if (UUID_REGEX.test(trimmed)) {
    return { id: trimmed.toLowerCase() };
  }

  const match = trimmed.match(SHORT_ID_REGEX);
  if (match && match[1]) {
    return { shortId: match[1].toLowerCase() };
  }

  return null;
}

module.exports = {
  slugify,
  shortId,
  buildRef,
  parseRef,
};

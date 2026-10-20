/**
 * Expresión regular canónica para eliminar separadores (espacios y guiones) de un ISBN.
 */
const ISBN_SEPARADORES_REGEX = /[-\s]/g;

/**
 * Normaliza una cadena eliminando espacios y guiones, y recortando extremos.
 * Helper interno compartido entre normalizarIsbn y normalizarIsbnEstricto.
 *
 * @param {string} str
 * @returns {string}
 */
const limpiarSeparadores = (str) => str.replace(ISBN_SEPARADORES_REGEX, '').trim();

/**
 * Limpia un código ISBN eliminando guiones y espacios.
 * Comportamiento tolerante idéntico al de googleBooks.service.js:
 * Devuelve '' ante null, undefined o cadena vacía, y convierte con .toString().
 *
 * @param {any} isbn
 * @returns {string}
 */
function normalizarIsbn(isbn) {
  if (!isbn) return '';
  return limpiarSeparadores(isbn.toString());
}

/**
 * Normaliza un código ISBN eliminando guiones y espacios.
 * Comportamiento estricto idéntico al de validator.js (normalizeIsbnForValidation):
 * Lanza TypeError ante null o undefined al invocar directamente .replace().
 *
 * @param {string} valor
 * @returns {string}
 */
function normalizarIsbnEstricto(valor) {
  return limpiarSeparadores(valor);
}

/**
 * Valida el dígito verificador (checksum) de un ISBN-10 o ISBN-13.
 * Trasladado tal cual desde validator.js.
 *
 * @param {string} isbn - ISBN normalizado sin guiones ni espacios
 * @returns {boolean}
 */
const hasValidIsbnChecksum = (isbn) => {
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn.slice(0, 12)].reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
      0
    );
    return (10 - (sum % 10)) % 10 === Number(isbn[12]);
  }

  if (/^\d{9}[\dX]$/i.test(isbn)) {
    const sum = [...isbn].reduce((total, character, index) => {
      const value = character.toUpperCase() === 'X' ? 10 : Number(character);
      return total + value * (10 - index);
    }, 0);
    return sum % 11 === 0;
  }

  return false;
};

module.exports = {
  normalizarIsbn,
  normalizarIsbnEstricto,
  hasValidIsbnChecksum,
};

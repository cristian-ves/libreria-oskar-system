/**
 * Un JWT es vigente si la contraseña nunca se restableció o si se emitió después
 * del último cambio. Estricta a propósito (falla cerrada): `iat` está en segundos,
 * así que un token emitido en el mismo segundo del cambio se rechaza, y uno sin
 * `iat` se rechaza si hay cambio registrado.
 * @param {{ iat?: number }} decoded
 * @param {Date|string|null|undefined} passwordCambiadaEn
 * @returns {boolean}
 */
function sesionVigente(decoded, passwordCambiadaEn) {
  if (passwordCambiadaEn === null || passwordCambiadaEn === undefined) return true;
  const cambio = new Date(passwordCambiadaEn).getTime();
  if (!Number.isFinite(cambio) || typeof decoded?.iat !== 'number') return false;
  return decoded.iat * 1000 > cambio;
}

module.exports = { sesionVigente };

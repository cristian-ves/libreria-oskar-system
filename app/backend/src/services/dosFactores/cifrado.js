const crypto = require('node:crypto');
const env = require('../../config/env');

// Formato: v1:<iv>:<etiqueta>:<texto cifrado>, cada parte en base64url sin relleno.
// Con un secreto base32 de 32 caracteres: 3 + 16 + 1 + 22 + 1 + 43 = 86 ≤ VARCHAR(128).
const VERSION = 'v1';
const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12;
const ETIQUETA_BYTES = 16;
const INFO_CIFRADO = 'libreria-oskar/2fa/cifrado-secreto/v1';
const INFO_RESPALDO = 'libreria-oskar/2fa/hmac-respaldo/v1';

class ErrorDescifrado extends Error {
  constructor() {
    super('No fue posible descifrar el secreto 2FA.');
    this.name = 'ErrorDescifrado';
  }
}

/**
 * Deriva una subclave de 32 bytes con HKDF-SHA256 para un propósito (`info`).
 * La clave maestra nunca se usa directamente.
 */
function derivarClave(info, claveMaestra = env.twoFactor.encryptionKey) {
  return Buffer.from(crypto.hkdfSync('sha256', claveMaestra, Buffer.alloc(0), info, 32));
}

const b64 = (buffer) => buffer.toString('base64url');

/**
 * Cifra `texto` con AES-256-GCM, IV aleatorio y el id del usuario como AAD.
 * @param {string} texto
 * @param {string} usuarioId
 * @param {Buffer} [claveMaestra]
 * @returns {string}
 */
function cifrar(texto, usuarioId, claveMaestra) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, derivarClave(INFO_CIFRADO, claveMaestra), iv, {
    authTagLength: ETIQUETA_BYTES,
  });
  cipher.setAAD(Buffer.from(String(usuarioId), 'utf8'));
  const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  return [VERSION, b64(iv), b64(cipher.getAuthTag()), b64(cifrado)].join(':');
}

/**
 * Descifra un valor producido por `cifrar`. Falla cerrada: ante cualquier problema
 * (formato, versión, clave, manipulación o usuario distinto) lanza ErrorDescifrado.
 * @returns {string}
 */
function descifrar(valor, usuarioId, claveMaestra) {
  try {
    const partes = typeof valor === 'string' ? valor.split(':') : [];
    if (partes.length !== 4 || partes[0] !== VERSION) throw new ErrorDescifrado();
    const [, iv, etiqueta, cifrado] = partes.map((p) => Buffer.from(p, 'base64url'));
    if (iv.length !== IV_BYTES || etiqueta.length !== ETIQUETA_BYTES || cifrado.length === 0) {
      throw new ErrorDescifrado();
    }
    const decipher = crypto.createDecipheriv(ALGORITMO, derivarClave(INFO_CIFRADO, claveMaestra), iv, {
      authTagLength: ETIQUETA_BYTES,
    });
    decipher.setAAD(Buffer.from(String(usuarioId), 'utf8'));
    decipher.setAuthTag(etiqueta);
    return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
  } catch {
    // No se propaga el error original para no filtrar detalles del texto cifrado.
    throw new ErrorDescifrado();
  }
}

module.exports = { cifrar, descifrar, derivarClave, ErrorDescifrado, INFO_RESPALDO, VERSION };

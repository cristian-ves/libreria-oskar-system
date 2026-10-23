const crypto = require('node:crypto');
const env = require('../../config/env');
const { derivarClave, INFO_RESPALDO } = require('./cifrado');

// 31 símbolos: dígitos 2-9 y letras A-Z sin I, L ni O (sin 0/O/1/I/L ambiguos).
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LONGITUD = 10;
const FORMATO = new RegExp(`^[${ALFABETO}]{${LONGITUD}}$`);

function generarUno() {
  let codigo = '';
  for (let i = 0; i < LONGITUD; i += 1) {
    codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  }
  return `${codigo.slice(0, 5)}-${codigo.slice(5)}`;
}

/** Genera el conjunto de códigos (texto XXXXX-XXXXX), todos distintos. */
function generarCodigos(cantidad = env.twoFactor.codigosRespaldo) {
  const codigos = new Set();
  while (codigos.size < cantidad) codigos.add(generarUno());
  return [...codigos];
}

/** Mayúsculas, sin guiones ni espacios. Devuelve null si el formato no es válido. */
function normalizar(codigo) {
  if (typeof codigo !== 'string') return null;
  const limpio = codigo.toUpperCase().replace(/[\s-]+/g, '');
  return FORMATO.test(limpio) ? limpio : null;
}

/**
 * HMAC-SHA256 (hex, 64 caracteres) con una subclave HKDF propia y el usuario dentro
 * del mensaje: sin la clave del servidor un volcado de la BD no permite adivinarlos.
 */
function hashCodigo(usuarioId, codigoNormalizado, claveMaestra) {
  return crypto
    .createHmac('sha256', derivarClave(INFO_RESPALDO, claveMaestra))
    .update(`${usuarioId}:${codigoNormalizado}`, 'utf8')
    .digest('hex');
}

module.exports = { generarCodigos, normalizar, hashCodigo, ALFABETO, LONGITUD };

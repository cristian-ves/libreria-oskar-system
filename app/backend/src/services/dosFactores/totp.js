const crypto = require('node:crypto');
const { generateSecret, generateURI, generateSync, verifySync } = require('otplib');
const QRCode = require('qrcode');
const env = require('../../config/env');

const FORMATO_CODIGO = /^\d{6}$/;

const opciones = () => ({
  algorithm: env.twoFactor.algoritmo,
  digits: env.twoFactor.digitos,
  period: env.twoFactor.periodoSegundos,
});

/** Secreto base32 de 20 bytes (160 bits, 32 caracteres) generado por otplib. */
function generarSecreto() {
  return generateSecret({ length: 20 });
}

/** URI otpauth:// con emisor "Librería Oskar" y el email como etiqueta. */
function construirUri(secreto, email) {
  return generateURI({ issuer: env.twoFactor.emisor, label: email, secret: secreto, ...opciones() });
}

/** QR en PNG como data URL, generado en el servidor. */
function generarQr(uri) {
  return QRCode.toDataURL(uri, { type: 'image/png', errorCorrectionLevel: 'M', margin: 2, width: 256 });
}

/**
 * Normaliza un código de 6 dígitos (quita espacios). Devuelve null si el formato no es válido.
 */
function normalizarCodigo(codigo) {
  if (typeof codigo !== 'string') return null;
  const limpio = codigo.replace(/\s+/g, '');
  return FORMATO_CODIGO.test(limpio) ? limpio : null;
}

/**
 * Verifica `codigo` con tolerancia de ±toleranciaPasos y devuelve el paso TOTP
 * que coincidió (para anti-reutilización), o null si no coincide.
 * otplib compara en tiempo constante y devuelve `timeStep`; aun así se recalcula
 * el paso de forma explícita y se compara con crypto.timingSafeEqual.
 * @param {string} secreto base32 en claro (solo en memoria)
 * @param {string} codigo ya normalizado
 * @param {number} [epoch] segundos Unix (para pruebas)
 * @returns {number|null}
 */
function verificarCodigo(secreto, codigo, epoch = Math.floor(Date.now() / 1000)) {
  const { periodoSegundos, toleranciaPasos } = env.twoFactor;
  const resultado = verifySync({
    secret: secreto,
    token: codigo,
    epoch,
    epochTolerance: periodoSegundos * toleranciaPasos,
    ...opciones(),
  });
  if (!resultado.valid) return null;

  const paso = Math.floor(epoch / periodoSegundos) + resultado.delta;
  const esperado = generateSync({ secret: secreto, epoch: paso * periodoSegundos, ...opciones() });
  const iguales = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(codigo));
  return iguales && paso === resultado.timeStep ? paso : null;
}

module.exports = { generarSecreto, construirUri, generarQr, normalizarCodigo, verificarCodigo };

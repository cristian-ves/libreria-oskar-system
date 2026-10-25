const crypto = require('node:crypto');

// 32 bytes aleatorios en base64url: 43 caracteres sin relleno.
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

const generarToken = () => crypto.randomBytes(32).toString('base64url');

// En la BD solo se guarda el SHA-256 hexadecimal (64 caracteres).
const hashToken = (token) => crypto.createHash('sha256').update(token, 'utf8').digest('hex');

const formatoValido = (token) => typeof token === 'string' && FORMATO_TOKEN.test(token);

module.exports = { generarToken, hashToken, formatoValido, FORMATO_TOKEN };

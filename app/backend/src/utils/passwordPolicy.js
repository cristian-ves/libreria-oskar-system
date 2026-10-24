const { ValidationError } = require('./errors');

const MAX_BCRYPT_BYTES = 72;

function validarPassword(password) {
  if (typeof password !== 'string' || password.length === 0) throw new ValidationError('La contraseña es obligatoria.');
  if (Array.from(password).length < 10) throw new ValidationError('La contraseña debe tener al menos 10 caracteres.');
  if (!/\p{L}/u.test(password)) throw new ValidationError('La contraseña debe incluir al menos una letra.');
  if (!/\p{N}/u.test(password)) throw new ValidationError('La contraseña debe incluir al menos un número.');
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_BYTES) throw new ValidationError('La contraseña no puede superar 72 bytes en UTF-8.');
  return password;
}

module.exports = { validarPassword, MAX_BCRYPT_BYTES };

const env = require('../../config/env');
const dosFactoresRepository = require('../../repositories/dosFactores.repository');
const { AppError, UnauthorizedError } = require('../../utils/errors');
const { descifrar } = require('./cifrado');

const MENSAJE_INVALIDO = 'Código inválido o vencido.';

const errorBloqueo = () =>
  new AppError('Demasiados intentos fallidos. Intente de nuevo en unos minutos.', 429);

/** Carga el estado 2FA; el usuario debe existir y seguir activo. */
async function cargarEstado(usuarioId, options) {
  const estado = await dosFactoresRepository.obtenerEstado(usuarioId, options);
  if (!estado || !estado.activo) throw new UnauthorizedError('Usuario no encontrado');
  return estado;
}

/** Con el usuario bloqueado todo intento responde 429, sin mirar el código. */
function asegurarNoBloqueado(estado) {
  if (estado.bloqueado) throw errorBloqueo();
}

/**
 * Reserva un intento antes de verificar el código (sentencia atómica, confirmada fuera de
 * cualquier transacción): acota también los intentos concurrentes. Sin cupo → 429.
 * @returns {Promise<boolean>} `bloqueadoAhora`: esta reserva agotó el cupo y fijó el bloqueo.
 */
async function reservarIntento(usuarioId) {
  const { maxIntentos, bloqueoMinutos } = env.twoFactor;
  const { permitido, bloqueadoAhora } = await dosFactoresRepository.reservarIntento(usuarioId, maxIntentos, bloqueoMinutos);
  if (!permitido) throw errorBloqueo();
  return bloqueadoAhora;
}

/** Código incorrecto (el intento ya quedó contado): 429 si su reserva bloqueó; si no, `TipoError`. */
function rechazar(bloqueadoAhora, TipoError = UnauthorizedError) {
  throw bloqueadoAhora ? errorBloqueo() : new TipoError(MENSAJE_INVALIDO);
}

/** Descifra el secreto. Falla cerrada: nunca concede acceso y no registra datos sensibles. */
function abrirSecreto(estado) {
  try {
    return descifrar(estado.dos_factores_secreto, estado.id);
  } catch {
    console.error(`[2FA] No se pudo descifrar el secreto del usuario ${estado.id}; acceso denegado.`);
    throw new AppError('No fue posible completar la verificación en dos pasos.', 500);
  }
}

module.exports = {
  cargarEstado, asegurarNoBloqueado, reservarIntento, rechazar, abrirSecreto, MENSAJE_INVALIDO,
};

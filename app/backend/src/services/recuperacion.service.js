const bcrypt = require('bcryptjs');
const env = require('../config/env');
const recuperacionRepository = require('../repositories/recuperacion.repository');
const mailService = require('./mail.service');
const { validarPassword } = require('../utils/passwordPolicy');
const { ValidationError } = require('../utils/errors');
const { generarToken, hashToken, formatoValido } = require('./recuperacion/token');
const { enlaceRestablecer, mensajeEnlace, mensajeAviso } = require('./recuperacion/correos');

const MENSAJE_SOLICITUD = 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña. '
  + 'Revisa también la carpeta de spam. El enlace vence en 30 minutos.';
const ENLACE_INVALIDO = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
const MISMA_PASSWORD = 'La nueva contraseña debe ser distinta de la actual.';
const MAX_EMAIL = 150;

// Envíos en curso: la petición no los espera (el tiempo de respuesta no debe delatar
// si el correo existe); las pruebas los esperan con esperarEnvios().
const pendientes = new Set();
const log = (mensaje) => console.warn(`[RECUPERACION] ${mensaje}`);

// `construir` arma el mensaje dentro de la cadena: si la plantilla o el logo fallan,
// solo se registra y la respuesta HTTP no cambia (no delata si el correo existe).
function enviarSinEsperar(construir, usuarioId, tipo) {
  const tarea = Promise.resolve()
    .then(() => mailService.enviar(construir()))
    .then((resultado) => {
      if (!resultado?.ok && !resultado?.reintentando) log(`No se pudo enviar el correo de ${tipo} al usuario ${usuarioId}.`);
    })
    .catch(() => log(`Fallo inesperado al enviar el correo de ${tipo} al usuario ${usuarioId}.`))
    .finally(() => pendientes.delete(tarea));
  pendientes.add(tarea);
}

class RecuperacionService {
  /**
   * Solicita un enlace de recuperación. Responde siempre lo mismo si el formato es válido.
   * @param {unknown} email
   * @returns {Promise<{ mensaje: string }>}
   */
  async solicitar(email) {
    const limpio = typeof email === 'string' ? email.trim() : '';
    if (!limpio || limpio.length > MAX_EMAIL) {
      throw new ValidationError('El correo es obligatorio y no debe superar 150 caracteres.');
    }
    const respuesta = { mensaje: MENSAJE_SOLICITUD };
    const config = env.recuperacion;
    if (!config.frontendUrl) {
      log('Envío inhabilitado: falta FRONTEND_URL.');
      return respuesta;
    }

    const usuario = await recuperacionRepository.buscarActivoPorEmail(limpio);
    if (!usuario) return respuesta;

    const token = generarToken();
    const emitido = await recuperacionRepository.emitirToken(usuario.id, hashToken(token), config);
    if (!emitido) return respuesta; // enlace emitido hace menos del enfriamiento

    enviarSinEsperar(() => mensajeEnlace({
      usuario, enlace: enlaceRestablecer(config.frontendUrl, token), vencimientoMinutos: config.vencimientoMinutos,
    }), usuario.id, 'recuperación');
    return respuesta;
  }

  /**
   * Restablece la contraseña con un token de un solo uso. No toca el 2FA ni inicia sesión.
   * @param {{ token: unknown, password: unknown }} datos
   * @returns {Promise<{ restablecido: true }>}
   */
  async restablecer({ token, password } = {}) {
    if (!formatoValido(token)) throw new ValidationError(ENLACE_INVALIDO);
    validarPassword(password); // no consume el token

    const hash = hashToken(token);
    const usuario = await recuperacionRepository.buscarPorTokenVigente(hash);
    if (!usuario) throw new ValidationError(ENLACE_INVALIDO);
    if (await bcrypt.compare(password, usuario.password_hash)) throw new ValidationError(MISMA_PASSWORD);

    const nuevoHash = await bcrypt.hash(password, 10);
    // Reloj de la app: se compara con el `iat` de los JWT que firma la app.
    const consumido = await recuperacionRepository.consumirToken(hash, nuevoHash, new Date());
    if (!consumido) throw new ValidationError(ENLACE_INVALIDO);

    console.log(`[RECUPERACION] Contraseña restablecida para el usuario ${usuario.id}.`);
    enviarSinEsperar(() => mensajeAviso({ usuario }), usuario.id, 'aviso');
    return { restablecido: true };
  }

  /** Espera los envíos iniciados y sus reintentos (para pruebas y apagado ordenado). */
  async esperarEnvios() {
    while (pendientes.size > 0) await Promise.allSettled([...pendientes]);
    await mailService.esperarPendientes();
  }
}

module.exports = new RecuperacionService();
module.exports.MENSAJE_SOLICITUD = MENSAJE_SOLICITUD;
module.exports.ENLACE_INVALIDO = ENLACE_INVALIDO;
module.exports.MISMA_PASSWORD = MISMA_PASSWORD;

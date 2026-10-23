const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuarioRepository = require('../repositories/usuario.repository');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Middleware para los pasos del 2FA: exige un token temporal con el `scope` indicado
 * ('2fa-verify' o '2fa-setup'), rechaza uno distinto o ausente y recarga el usuario
 * (debe seguir activo) en cada paso. Fija req.user como `authenticate`.
 * @param {string} alcance
 */
const exigirAlcance = (alcance) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de verificación no proporcionado');
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('El token de verificación ha expirado. Inicie sesión de nuevo.');
      }
      throw new UnauthorizedError('Token de verificación inválido');
    }

    if (!decoded || decoded.scope !== alcance) {
      throw new UnauthorizedError('Token de verificación inválido');
    }

    const usuario = await usuarioRepository.findById(decoded.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    req.user = {
      id: usuario.id,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol_nombre,
    };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { exigirAlcance };

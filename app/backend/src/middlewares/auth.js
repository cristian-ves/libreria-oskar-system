const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuarioRepository = require('../repositories/usuario.repository');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { sesionVigente } = require('../utils/sesionVigente');

/**
 * Middleware de autenticación mediante Bearer token JWT.
 * Valida el encabezado Authorization, verifica la firma del token y carga el usuario activo en req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticación no proporcionado');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Token de autenticación inválido');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('El token de autenticación ha expirado');
      }
      throw new UnauthorizedError('Token de autenticación inválido');
    }

    // Los tokens temporales del 2FA (con claim `scope`) no abren sesión completa.
    if (decoded && Object.hasOwn(decoded, 'scope')) {
      throw new UnauthorizedError('Token de autenticación inválido');
    }

    const usuario = await usuarioRepository.findById(decoded.sub);
    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    if (!usuario.activo) {
      throw new UnauthorizedError('El usuario ya no está activo');
    }

    // Tras un restablecimiento de contraseña, los tokens emitidos antes dejan de valer.
    if (!sesionVigente(decoded, usuario.password_cambiada_en)) {
      throw new UnauthorizedError('La sesión ya no es válida. Inicie sesión de nuevo.');
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

/**
 * Middleware de autorización RBAC basado en roles.
 * @param {...string} roles - Roles permitidos para acceder a la ruta.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    if (!roles.includes(req.user.rol)) {
      return next(new ForbiddenError('Acceso denegado: permisos insuficientes'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

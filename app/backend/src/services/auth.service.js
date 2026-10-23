const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuario.repository');
const env = require('../config/env');
const { ValidationError, UnauthorizedError } = require('../utils/errors');
// Import directo del módulo de sesión (no de la fachada) para evitar un ciclo de require.
const { resolverSegundoPaso } = require('./dosFactores/sesion');

class AuthService {
  /**
   * Autentica a un usuario y genera un token de acceso JWT.
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ token: string, usuario: { id: string, nombre_completo: string, email: string, rol: string } }>}
   */
  async login({ email, password }) {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new ValidationError('El correo electrónico y la contraseña son requeridos.');
    }

    const usuario = await usuarioRepository.findByEmail(email.trim());
    if (!usuario) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedError('El usuario se encuentra inactivo.');
    }

    // Segundo factor: { paso, tokenTemporal, expiraEnSegundos } en lugar de la sesión.
    const segundoPaso = resolverSegundoPaso(usuario);
    if (segundoPaso) {
      return segundoPaso;
    }

    return this.emitirSesion(usuario);
  }

  /**
   * Emite el JWT de sesión completa (login normal y segundo paso 2FA).
   * @param {{ id: string, rol_nombre: string, nombre_completo: string, email: string }} usuario
   * @returns {{ token: string, usuario: { id: string, nombre_completo: string, email: string, rol: string } }}
   */
  emitirSesion(usuario) {
    const payload = {
      sub: usuario.id,
      rol: usuario.rol_nombre,
      nombre: usuario.nombre_completo,
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol_nombre,
      },
    };
  }
}

module.exports = new AuthService();

const authService = require('../services/auth.service');

class AuthController {
  /**
   * Endpoint: POST /api/auth/login
   * Autentica con credenciales (email y password) y responde con el token JWT y perfil de usuario.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const resultado = await authService.login({ email, password });

      return res.status(200).json({
        status: 'success',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/auth/me
   * Devuelve los datos del usuario autenticado obtenido desde el token JWT.
   */
  async me(req, res, next) {
    try {
      return res.status(200).json({
        status: 'success',
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();

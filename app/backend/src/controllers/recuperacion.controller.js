const recuperacionService = require('../services/recuperacion.service');

// Cache-Control: no-store lo fija la ruta antes del limitador (cubre 200, 400 y 429).
class RecuperacionController {
  /** Endpoint: POST /api/auth/recuperar (público). Body: { email }. */
  async recuperar(req, res, next) {
    try {
      const data = await recuperacionService.solicitar(req.body?.email);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: POST /api/auth/restablecer (público). Body: { token, password }. */
  async restablecer(req, res, next) {
    try {
      const { token, password } = req.body || {};
      const data = await recuperacionService.restablecer({ token, password });
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecuperacionController();

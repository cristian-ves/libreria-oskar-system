const dosFactoresService = require('../services/dosFactores.service');

// Las respuestas con secretos, códigos o tokens no deben guardarse en caché.
const sinCache = (res) => res.set('Cache-Control', 'no-store');

class DosFactoresController {
  /** Endpoint: POST /api/auth/2fa/configurar (token temporal 2fa-setup). */
  async configurar(req, res, next) {
    try {
      const data = await dosFactoresService.configurar(req.user.id);
      return sinCache(res).status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: POST /api/auth/2fa/activar (token temporal 2fa-setup). Body: { codigo }. */
  async activar(req, res, next) {
    try {
      const data = await dosFactoresService.activar(req.user.id, req.body?.codigo);
      return sinCache(res).status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: POST /api/auth/2fa/verificar (token temporal 2fa-verify). Body: { codigo } o { codigoRespaldo }. */
  async verificar(req, res, next) {
    try {
      const { codigo, codigoRespaldo } = req.body || {};
      const data = await dosFactoresService.verificar(req.user.id, { codigo, codigoRespaldo });
      return sinCache(res).status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: GET /api/auth/2fa/estado (sesión completa). */
  async estado(req, res, next) {
    try {
      const data = await dosFactoresService.estado(req.user.id);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: POST /api/auth/2fa/respaldo/regenerar (sesión completa). Body: { codigo }. */
  async regenerarRespaldo(req, res, next) {
    try {
      const data = await dosFactoresService.regenerarRespaldo(req.user.id, req.body?.codigo);
      return sinCache(res).status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /** Endpoint: POST /api/auth/2fa/usuarios/:id/restablecer (solo Administrador). */
  async restablecer(req, res, next) {
    try {
      const data = await dosFactoresService.restablecerPorAdministrador(req.user.id, req.params.id);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DosFactoresController();

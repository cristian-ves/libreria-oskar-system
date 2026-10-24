const reportesService = require('../services/reportes.service');

class ReportesController {
  async inventarioValorizado(req, res, next) {
    try {
      const { libroId, categoriaId, bodegaId, limit = '50', offset = '0' } = req.query;
      const data = await reportesService.generarInventarioValorizado({
        libroId, categoriaId, bodegaId, limit: Number(limit), offset: Number(offset),
      });
      return res.status(200).json({ status: 'success', data });
    } catch (error) { return next(error); }
  }

  async kardex(req, res, next) {
    try {
      const { libroId, categoriaId, bodegaId, tipo, desde, hasta, limit = '50', offset = '0' } = req.query;
      const data = await reportesService.generarKardex({
        libroId, categoriaId, bodegaId, tipo, desde, hasta,
        limit: Number(limit), offset: Number(offset),
      });
      return res.status(200).json({ status: 'success', data });
    } catch (error) { return next(error); }
  }
}

module.exports = new ReportesController();

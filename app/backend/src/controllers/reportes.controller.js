const reportesService = require('../services/reportes.service');

class ReportesController {
  async corteCaja(req, res, next) {
    try { return res.status(200).json({ status: 'success', data: await reportesService.generarCorteCaja(req.query) }); }
    catch (error) { return next(error); }
  }

  async resumenPeriodo(req, res, next) {
    try { return res.status(200).json({ status: 'success', data: await reportesService.generarResumenPeriodo(req.query) }); }
    catch (error) { return next(error); }
  }

  async librosMasVendidos(req, res, next) {
    try { return res.status(200).json({ status: 'success', data: await reportesService.generarLibrosMasVendidos(req.query) }); }
    catch (error) { return next(error); }
  }

  async reposicion(req, res, next) {
    try { return res.status(200).json({ status: 'success', data: await reportesService.generarReposicion(req.query) }); }
    catch (error) { return next(error); }
  }

  async ventas(req, res, next) {
    try { return res.status(200).json({ status: 'success', data: await reportesService.generarVentas(req.query) }); }
    catch (error) { return next(error); }
  }

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

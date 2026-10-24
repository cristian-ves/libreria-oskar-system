const reportesService = require('../services/reportes.service');
const exportacionReportesService = require('../services/reportes/exportadores/exportacion.service');

class ReportesController {
  async exportar(req, res, next) {
    try {
      const archivo = await exportacionReportesService.generar({
        tipo: req.params.tipo,
        formato: req.query.formato,
        query: req.query,
      });
      res.status(200);
      res.setHeader('Content-Type', archivo.mime);
      res.setHeader('Content-Disposition', `attachment; filename="${archivo.filename}"`);
      res.setHeader('Content-Length', archivo.buffer.length);
      return res.send(archivo.buffer);
    } catch (error) { return next(error); }
  }

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

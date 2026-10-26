const bodegaService = require('../services/bodegaGestion.service');

class BodegaAdminController {
  async listarPorSucursal(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await bodegaService.listarPorSucursal(req.params.sucursalId, req.query) }); } catch (error) { next(error); }
  }
  async detalle(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await bodegaService.detalle(req.params.id) }); } catch (error) { next(error); }
  }
  async crear(req, res, next) {
    try { res.status(201).json({ status: 'success', data: await bodegaService.crear(req.params.sucursalId, req.body) }); } catch (error) { next(error); }
  }
  async actualizar(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await bodegaService.actualizar(req.params.id, req.body) }); } catch (error) { next(error); }
  }
  async cambiarActivo(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await bodegaService.cambiarActivo(req.params.id, req.body?.activo) }); } catch (error) { next(error); }
  }
}

module.exports = new BodegaAdminController();

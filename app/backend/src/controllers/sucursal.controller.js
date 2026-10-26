const sucursalService = require('../services/sucursal.service');

class SucursalController {
  async listar(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await sucursalService.listar(req.query) }); } catch (error) { next(error); }
  }
  async detalle(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await sucursalService.detalle(req.params.id) }); } catch (error) { next(error); }
  }
  async bodegas(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await sucursalService.bodegas(req.params.id, req.query) }); } catch (error) { next(error); }
  }
  async crear(req, res, next) {
    try { res.status(201).json({ status: 'success', data: await sucursalService.crear(req.body) }); } catch (error) { next(error); }
  }
  async actualizar(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await sucursalService.actualizar(req.params.id, req.body) }); } catch (error) { next(error); }
  }
  async cambiarActivo(req, res, next) {
    try { res.status(200).json({ status: 'success', data: await sucursalService.cambiarActivo(req.params.id, req.body?.activo) }); } catch (error) { next(error); }
  }
}

module.exports = new SucursalController();

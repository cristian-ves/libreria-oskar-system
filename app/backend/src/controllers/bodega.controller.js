const bodegaService = require('../services/bodega.service');

class BodegaController {
  /**
   * Endpoint: GET /api/bodegas
   * Listado de bodegas para dropdowns y asignaciones.
   * Responde con { status: 'success', data } exactamente igual que el handler inline original.
   */
  async listar(req, res, next) {
    try {
      const data = await bodegaService.listarActivas();
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BodegaController();

const ventaService = require('../services/venta.service');

class VentaController {
  /**
   * Endpoint: POST /api/ventas
   * Registra una venta. El vendedor sale siempre de req.user.id.
   */
  async crear(req, res, next) {
    try {
      const { bodegaId, items, metodoPago, clienteNombre, clienteNit, descuento, notas } = req.body;
      const data = await ventaService.crearVenta({
        bodegaId,
        items,
        metodoPago,
        clienteNombre,
        clienteNit,
        descuento,
        notas,
        usuarioId: req.user.id,
      });
      return res.status(201).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/ventas
   * Lista ventas con filtros por estado y rango de fechas, con paginación.
   */
  async listar(req, res, next) {
    try {
      const { estado, desde, hasta, limit, offset } = req.query;
      const data = await ventaService.listarVentas({ estado, desde, hasta, limit, offset });
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/ventas/:id
   */
  async obtener(req, res, next) {
    try {
      const data = await ventaService.obtenerVenta(req.params.id);
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/ventas/:id/anular
   */
  async anular(req, res, next) {
    try {
      const data = await ventaService.anularVenta({
        ventaId: req.params.id,
        motivo: req.body.motivo,
        usuarioId: req.user.id,
      });
      return res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VentaController();

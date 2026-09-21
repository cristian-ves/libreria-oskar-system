const inventarioService = require('../services/inventario.service');

class InventarioController {
  /**
   * Endpoint: GET /api/inventario
   * Lista existencias con filtros por estado, búsqueda y bodega.
   */
  async listar(req, res, next) {
    try {
      const { estado, q, bodegaId } = req.query;
      const data = await inventarioService.listarInventario({ estado, q, bodegaId });
      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/inventario/resumen
   * Retorna métricas generales de existencias, alertas y libros sin precio.
   */
  async resumen(req, res, next) {
    try {
      const data = await inventarioService.obtenerResumen();
      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/movimientos
   * Lista el kardex con paginación y filtros opcionales.
   */
  async listarMovimientos(req, res, next) {
    try {
      const { libroId, bodegaId, tipo, limit, offset } = req.query;
      const data = await inventarioService.listarMovimientos({
        libroId,
        bodegaId,
        tipo,
        limit,
        offset,
      });
      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/inventario/:id/salida
   * Registra una salida de mercancía por inventario_id.
   */
  async salida(req, res, next) {
    try {
      const { id: inventarioId } = req.params;
      const { cantidad, motivo } = req.body;

      const data = await inventarioService.registrarSalida({
        inventarioId,
        cantidad,
        motivo,
        usuarioId: req.user.id,
      });

      return res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/inventario/:id/ajuste
   * Registra un ajuste de stock por inventario_id.
   */
  async ajuste(req, res, next) {
    try {
      const { id: inventarioId } = req.params;
      const { stockNuevo, motivo } = req.body;

      const data = await inventarioService.registrarAjuste({
        inventarioId,
        stockNuevo,
        motivo,
        usuarioId: req.user.id,
      });

      return res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventarioController();

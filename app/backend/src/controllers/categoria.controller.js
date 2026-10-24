const categoriaService = require('../services/categoria.service');

class CategoriaController {
  /**
   * Endpoint: GET /api/categorias
   * Listado de categorías temáticas para catálogo y filtros.
   * Responde con { status: 'success', data } exactamente igual que el handler inline original.
   */
  async listar(req, res, next) {
    try {
      const categorias = await categoriaService.listar();
      res.status(200).json({
        status: 'success',
        data: categorias,
      });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try {
      const data = await categoriaService.crear(req.body);
      res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  async renombrar(req, res, next) {
    try {
      const data = await categoriaService.renombrar(req.params.id, req.body);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  async eliminar(req, res, next) {
    try {
      const data = await categoriaService.eliminar(req.params.id);
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }
}

module.exports = new CategoriaController();

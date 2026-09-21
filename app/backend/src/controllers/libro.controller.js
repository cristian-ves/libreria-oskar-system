const libroService = require('../services/libro.service');

class LibroController {
  /**
   * Endpoint: POST /api/libros/escanear
   * Recibe isbn, bodegaId y usuarioId en el cuerpo de la petición.
   */
  async escanear(req, res, next) {
    try {
      const { isbn, bodegaId, usuarioId } = req.body;

      const resultado = await libroService.escanearLibro({
        isbn,
        bodegaId,
        usuarioId,
      });

      const statusCode = resultado.es_nuevo_en_catalogo ? 201 : 200;

      return res.status(statusCode).json({
        status: 'success',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/libros
   * Lista libros y busca por término opcional ?q=...
   */
  async listar(req, res, next) {
    try {
      const { q } = req.query;
      const libroRepository = require('../repositories/libro.repository');
      const libros = await libroRepository.searchAndList(q);
      return res.status(200).json({
        status: 'success',
        results: libros.length,
        data: libros,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LibroController();

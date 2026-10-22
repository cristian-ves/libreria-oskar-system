const libroService = require('../services/libro.service');
const catalogoService = require('../services/catalogo.service');

class LibroController {
  /**
   * Endpoint: POST /api/libros/escanear
   * Recibe isbn y bodegaId en el cuerpo de la petición.
   * usuarioId se toma siempre de req.user (inyectado por authenticate).
   */
  async escanear(req, res, next) {
    try {
      const { isbn, bodegaId } = req.body;
      const usuarioId = req.user.id;

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
   * Lista libros y busca por término opcional ?q=... y categoría opcional ?categoriaId=...|?categoria_id=...
   */
  async listar(req, res, next) {
    try {
      const { q, categoriaId, categoria_id } = req.query;
      const data = await catalogoService.listar({
        q,
        categoriaId: categoriaId || categoria_id || null,
      });
      return res.status(200).json({
        status: 'success',
        results: data.length,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/libros/consultar
   * body: { isbn }
   * Responde 200 { existe: true, libro, inventarios } o { existe: false, sugerencia }.
   * Nunca 404 ni 500 por ausencia de libro o fallo de API externa.
   */
  async consultar(req, res, next) {
    try {
      const { isbn } = req.body;
      const resultado = await libroService.consultarLibro({ isbn });
      return res.status(200).json({
        status: 'success',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/libros/registrar
   * body: { isbn?, titulo, autor, editorial?, categoriaId, resena, imagenUrl?, precio?, cantidad, stockMinimo?, bodegaId }
   * usuarioId y rol tomados siempre de req.user (inyectado por authenticate).
   */
  async registrar(req, res, next) {
    try {
      const {
        isbn,
        titulo,
        autor,
        editorial,
        categoriaId,
        resena,
        imagenUrl,
        precio,
        cantidad,
        stockMinimo,
        bodegaId,
      } = req.body;

      const resultado = await libroService.registrarLibro({
        isbn,
        titulo,
        autor,
        editorial,
        categoriaId,
        resena,
        imagenUrl,
        precio,
        cantidad,
        stockMinimo,
        bodegaId,
        usuarioId: req.user.id,
        usuarioRol: req.user.rol,
      });

      return res.status(201).json({
        status: 'success',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: POST /api/libros/:id/ingreso
   * body: { bodegaId, cantidad }
   * usuarioId tomado de req.user.id.
   */
  async ingreso(req, res, next) {
    try {
      const { id: libroId } = req.params;
      const { bodegaId, cantidad } = req.body;

      const resultado = await libroService.ingresoLibro({
        libroId,
        bodegaId,
        cantidad,
        usuarioId: req.user.id,
      });

      return res.status(201).json({
        status: 'success',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: PATCH /api/libros/:id/precio
   * body: { precio }
   */
  async actualizarPrecio(req, res, next) {
    try {
      const { id: libroId } = req.params;
      const { precio } = req.body;

      const libro = await libroService.actualizarPrecio({ libroId, precio });

      return res.status(200).json({
        status: 'success',
        data: libro,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint: GET /api/libros/:ref
   * Obtiene el detalle público de un libro por su ref (slug-shortId) o UUID.
   */
  async detalle(req, res, next) {
    try {
      const { ref } = req.params;
      const data = await catalogoService.detalle(ref);
      return res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LibroController();

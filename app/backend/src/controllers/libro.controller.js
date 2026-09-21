const libroService = require('../services/libro.service');
const libroRepository = require('../repositories/libro.repository');
const { buildRef, parseRef } = require('../utils/slug');
const { ValidationError, NotFoundError } = require('../utils/errors');

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
   * Lista libros y busca por término opcional ?q=... y categoría opcional ?categoriaId=...|?categoria_id=...
   */
  async listar(req, res, next) {
    try {
      const { q, categoriaId, categoria_id } = req.query;
      const catId = categoriaId || categoria_id || null;
      const libros = await libroRepository.searchAndList(q, catId);
      const data = libros.map((l) => ({
        ...l,
        ref: buildRef(l),
      }));
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
   * Endpoint: GET /api/libros/:ref
   * Obtiene el detalle público de un libro por su ref (slug-shortId) o UUID.
   */
  async detalle(req, res, next) {
    try {
      const { ref } = req.params;
      const parsed = parseRef(ref);
      if (!parsed) {
        throw new ValidationError('El identificador o referencia del libro es inválido.');
      }

      const libro = await libroRepository.findDetalleByRef(parsed);
      if (!libro) {
        throw new NotFoundError('Libro no encontrado.');
      }

      const data = {
        ...libro,
        ref: buildRef(libro),
      };

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

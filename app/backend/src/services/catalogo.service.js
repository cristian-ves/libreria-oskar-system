const libroRepository = require('../repositories/libro.repository');
const { buildRef, parseRef } = require('../utils/slug');
const { ValidationError, NotFoundError } = require('../utils/errors');

class CatalogoService {
  /**
   * Lista libros del catálogo con búsqueda opcional por texto y filtro de categoría.
   * Calcula la referencia amigable (ref) para cada libro.
   *
   * @param {{ q?: string, categoriaId?: string, categoria_id?: string }} [params]
   * @returns {Promise<Array<Object>>}
   */
  async listar({ q, categoriaId, categoria_id, limit = 50, offset = 0 } = {}, { includePagination = false } = {}) {
    const catId = categoriaId || categoria_id || null;
    const resultado = await libroRepository.searchAndList(q, catId, { limit, offset, includeTotal: includePagination });
    if (!includePagination) {
      return resultado.map((libro) => ({ ...libro, ref: buildRef(libro) }));
    }
    return {
      ...resultado,
      data: resultado.data.map((l) => ({
      ...l,
      ref: buildRef(l),
      })),
    };
  }

  /**
   * Obtiene el detalle público de un libro por su ref (slug-shortId) o UUID.
   *
   * @param {string} ref
   * @returns {Promise<Object>}
   */
  async detalle(ref) {
    const parsed = parseRef(ref);
    if (!parsed) {
      throw new ValidationError('El identificador o referencia del libro es inválido.');
    }

    const libro = await libroRepository.findDetalleByRef(parsed);
    if (!libro) {
      throw new NotFoundError('Libro no encontrado.');
    }

    return {
      ...libro,
      ref: buildRef(libro),
    };
  }
}

module.exports = new CatalogoService();

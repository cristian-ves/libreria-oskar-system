const categoriaRepository = require('../repositories/categoria.repository');

class CategoriaService {
  /**
   * Devuelve todas las categorías ordenadas ASC por nombre.
   * Delega en el método existente de categoriaRepository.
   * @returns {Promise<Array<{ id: string, nombre: string }>>}
   */
  async listar() {
    return categoriaRepository.findAll();
  }
}

module.exports = new CategoriaService();

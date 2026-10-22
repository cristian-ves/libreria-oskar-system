const libroRepository = require('../../repositories/libro.repository');
const { NotFoundError } = require('../../utils/errors');

module.exports = {
  /**
   * Fija o corrige el precio de un libro existente. No toca stock ni movimientos.
   *
   * @param {{ libroId: string, precio: number|string }} params
   */
  async actualizarPrecio({ libroId, precio }) {
    const libro = await libroRepository.updatePrecio(libroId, Number(precio));
    if (!libro) {
      throw new NotFoundError(`El libro indicado (ID: ${libroId}) no existe.`);
    }
    return libro;
  },
};

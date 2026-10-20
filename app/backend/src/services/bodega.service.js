const bodegaRepository = require('../repositories/bodega.repository');

class BodegaService {
  /**
   * Devuelve todas las bodegas activas con su sucursal aplanada.
   * @returns {Promise<Array<{ id: string, nombre: string, descripcion: string, sucursal_nombre: string|null }>>}
   */
  async listarActivas() {
    return bodegaRepository.findActivas();
  }
}

module.exports = new BodegaService();

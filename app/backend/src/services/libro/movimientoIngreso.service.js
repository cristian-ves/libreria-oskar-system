const inventarioRepository = require('../../repositories/inventario.repository');
const movimientoRepository = require('../../repositories/movimiento.repository');

// Los métodos usan `this` (fachada LibroService) para conservar la resolución dinámica
// de _upsertAutor/_upsertEditorial/_crearMovimientoIngreso y su parcheo en pruebas.
module.exports = {
  /**
   * @private
   * Asegura el tipo Ingreso, inserta el movimiento y retorna inventario actualizado.
   * @param {import('sequelize').Transaction} transaction
   * @param {{ inventarioId: string, usuarioId: string, cantidad: number, motivoDetalle: string }} params
   */
  async _crearMovimientoIngreso(transaction, { inventarioId, usuarioId, cantidad, motivoDetalle }) {
    const txOptions = { transaction };
    let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ingreso', txOptions);
    if (!tipoMovimiento) {
      tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
        'Ingreso',
        'Entrada de stock por compras de mercancía o transferencias.',
        txOptions
      );
    }

    const movimiento = await movimientoRepository.createMovimiento(txOptions, {
      inventarioId,
      usuarioId,
      tipoMovimientoId: tipoMovimiento.id,
      cantidad,
      motivoDetalle,
    });

    const inventarioActualizado = await inventarioRepository.findById(inventarioId, txOptions);

    return { movimiento, inventarioActualizado };
  },
};

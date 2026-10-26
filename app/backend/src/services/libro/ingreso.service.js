const { sequelize } = require('../../models');
const bodegaRepository = require('../../repositories/bodega.repository');
const libroRepository = require('../../repositories/libro.repository');
const inventarioRepository = require('../../repositories/inventario.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');

// Los métodos usan `this` (fachada LibroService) para conservar la resolución dinámica
// de _upsertAutor/_upsertEditorial/_crearMovimientoIngreso y su parcheo en pruebas.
module.exports = {
  /**
   * Registra un ingreso de mercancía para un libro ya existente.
   *
   * @param {{
   *   libroId: string,
   *   bodegaId: string,
   *   cantidad: number,
   *   usuarioId: string
   * }} params
   */
  async ingresoLibro({ libroId, bodegaId, cantidad, usuarioId }) {
    const cantidadNum = Number(cantidad);
    if (cantidad === undefined || cantidad === null || cantidad === '' ||
        !Number.isInteger(cantidadNum) || cantidadNum < 1) {
      throw new ValidationError('La cantidad debe ser un entero mayor o igual a 1.');
    }

    return await sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };
      const bodegaCheck = await bodegaRepository.findActivaById(bodegaId, txOptions);
      if (!bodegaCheck) throw new NotFoundError(`La bodega indicada (ID: ${bodegaId}) no existe o está inactiva.`);
      // Bloquea sucursal y bodega antes de cualquier modificación de existencias.
      // Validar libro
      const libro = await libroRepository.findByIdForUpdate(libroId, txOptions);
      if (!libro) {
        throw new NotFoundError(`El libro con ID ${libroId} no existe.`);
      }
      if (!libro.activo) throw new ConflictError('No se pueden ingresar existencias de un libro inactivo.');

      // Obtener o crear inventario
      const inventario = await inventarioRepository.findOrCreate(txOptions, libroId, bodegaId);

      // Crear movimiento Ingreso
      const { movimiento, inventarioActualizado } = await this._crearMovimientoIngreso(transaction, {
        inventarioId: inventario.id,
        usuarioId,
        cantidad: cantidadNum,
        motivoDetalle: 'Ingreso de mercancía',
      });

      return {
        libro: {
          id: libro.id,
          titulo: libro.titulo,
          isbn: libro.isbn,
          imagen_url: libro.imagen_url,
        },
        inventario: {
          id: inventarioActualizado.id,
          bodega_id: bodegaId,
          stock_actual: inventarioActualizado.stock_actual,
          stock_minimo: inventarioActualizado.stock_minimo,
        },
        movimiento: {
          id: movimiento.id,
          tipo: 'Ingreso',
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo_detalle,
          fecha_movimiento: movimiento.fecha_movimiento,
        },
      };
    });
  },
};

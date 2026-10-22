const { sequelize } = require('../../models');
const ventaRepository = require('../../repositories/venta.repository');
const movimientoRepository = require('../../repositories/movimiento.repository');
const consulta = require('./consulta.service');
const { bloquearInventariosOrdenados } = require('./bloqueo.helper');
const { NotFoundError, ConflictError, AppError } = require('../../utils/errors');
const { codigoVenta } = require('../../utils/ventas');

module.exports = {
  /**
   * Anula una venta completa en UNA transacción: restituye el stock con movimientos de Ingreso
   * (con `venta_id`) y marca la venta como Anulada. Solo el Administrador la invoca (ruta).
   * @param {{ ventaId: string, motivo: string, usuarioId: string }} params
   */
  async anularVenta({ ventaId, motivo, usuarioId }) {
    return sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };

      const venta = await ventaRepository.findByIdForUpdate(ventaId, txOptions);
      if (!venta) {
        throw new NotFoundError('La venta indicada no existe.');
      }
      if (venta.estado === 'Anulada') {
        throw new ConflictError('La venta ya está anulada.');
      }

      const lineas = await ventaRepository.findLineasByVenta(ventaId, txOptions);
      const inventarios = await bloquearInventariosOrdenados(
        lineas.map((l) => l.libro_id),
        venta.bodega_id,
        txOptions
      );
      if (inventarios.length !== lineas.length) {
        throw new AppError('No se encontró el inventario de alguna línea de la venta.', 500);
      }

      let tipoIngreso = await movimientoRepository.getTipoMovimientoByName('Ingreso', txOptions);
      if (!tipoIngreso) {
        tipoIngreso = await movimientoRepository.ensureTipoMovimiento(
          'Ingreso',
          'Entrada de stock por compras de mercancía a proveedores o transferencias.',
          txOptions
        );
      }

      const motivoLimpio = motivo.trim();
      const cantidadPorLibro = new Map(lineas.map((l) => [l.libro_id, l.cantidad]));
      for (const inv of inventarios) {
        await movimientoRepository.createMovimiento(txOptions, {
          inventarioId: inv.id,
          usuarioId,
          tipoMovimientoId: tipoIngreso.id,
          cantidad: cantidadPorLibro.get(inv.libro_id),
          motivoDetalle: `Anulación de venta ${codigoVenta(venta.numero)}: ${motivoLimpio}`,
          ventaId,
        });
      }

      await ventaRepository.marcarAnulada(ventaId, { anuladaPor: usuarioId, motivo: motivoLimpio }, txOptions);

      return consulta.obtenerVenta(ventaId, txOptions);
    });
  },
};

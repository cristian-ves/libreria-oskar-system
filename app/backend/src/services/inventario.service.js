const db = require('../config/db');
const env = require('../config/env');
const inventarioRepository = require('../repositories/inventario.repository');
const movimientoRepository = require('../repositories/movimiento.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class InventarioService {
  /**
   * Lista el inventario detallado por libro y bodega aplicando filtros de estado, búsqueda y bodega.
   * @param {{ estado?: string, q?: string, bodegaId?: string }} params
   */
  async listarInventario({ estado = 'todos', q = '', bodegaId = null }) {
    const diasStockObsoleto = env.diasStockObsoleto || 90;
    return await inventarioRepository.findAllWithDetails({
      estado,
      q,
      bodegaId,
      diasStockObsoleto,
    });
  }

  /**
   * Obtiene las métricas globales del inventario, alertas y libros sin precio.
   */
  async obtenerResumen() {
    const diasStockObsoleto = env.diasStockObsoleto || 90;
    return await inventarioRepository.getResumen(diasStockObsoleto);
  }

  /**
   * Consulta el kardex / movimientos de inventario con filtros y paginación.
   * @param {{ libroId?: string, bodegaId?: string, tipo?: string, limit?: number, offset?: number }} params
   */
  async listarMovimientos({ libroId = null, bodegaId = null, tipo = null, limit = 50, offset = 0 }) {
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    const off = Math.max(0, Number(offset) || 0);

    return await movimientoRepository.findAllWithFilters({
      libroId,
      bodegaId,
      tipo,
      limit: lim,
      offset: off,
    });
  }

  /**
   * Registra una salida de mercancía con control de concurrencia y validación de stock disponible.
   * @param {{ inventarioId: string, cantidad: number, motivo?: string, usuarioId: string }} params
   */
  async registrarSalida({ inventarioId, cantidad, motivo = 'Salida de mercancía', usuarioId }) {
    const cantNum = Number(cantidad);
    if (!Number.isInteger(cantNum) || cantNum < 1) {
      throw new ValidationError('La cantidad debe ser un entero mayor o igual a 1.');
    }

    return await db.withTransaction(async (client) => {
      // 1. Bloquear y verificar el registro de inventario
      const inventario = await inventarioRepository.findByIdForUpdate(inventarioId, client);
      if (!inventario) {
        throw new NotFoundError('El registro de inventario indicado no existe.');
      }

      // 2. Validar stock suficiente
      if (inventario.stock_actual < cantNum) {
        throw new ConflictError(
          `Stock insuficiente: disponible ${inventario.stock_actual}, solicitado ${cantNum}`
        );
      }

      // 3. Obtener o asegurar el tipo de movimiento 'Salida'
      let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Salida', client);
      if (!tipoMovimiento) {
        tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
          'Salida',
          'Salida de stock por ventas o transferencias.',
          client
        );
      }

      // 4. Insertar el movimiento (el trigger restará la cantidad del stock_actual de forma atómica)
      const movimiento = await movimientoRepository.createMovimiento(client, {
        inventarioId,
        usuarioId,
        tipoMovimientoId: tipoMovimiento.id,
        cantidad: cantNum,
        motivoDetalle: motivo || 'Salida de mercancía',
      });

      // 5. Consultar el inventario actualizado
      const inventarioActualizado = await inventarioRepository.findById(inventarioId, client);

      return {
        inventario: {
          id: inventarioActualizado.id,
          stock_actual: inventarioActualizado.stock_actual,
          stock_minimo: inventarioActualizado.stock_minimo,
          bajo_stock: inventarioActualizado.stock_actual <= inventarioActualizado.stock_minimo,
        },
        movimiento: {
          id: movimiento.id,
          tipo: 'Salida',
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo_detalle,
          fecha_movimiento: movimiento.fecha_movimiento,
        },
      };
    });
  }

  /**
   * Registra un ajuste de stock fijando el nuevo valor y registrando el motivo y stock anterior.
   * @param {{ inventarioId: string, stockNuevo: number, motivo: string, usuarioId: string }} params
   */
  async registrarAjuste({ inventarioId, stockNuevo, motivo, usuarioId }) {
    const stockNuevoNum = Number(stockNuevo);
    if (!Number.isInteger(stockNuevoNum) || stockNuevoNum < 0) {
      throw new ValidationError('El stock nuevo debe ser un número entero mayor o igual a 0.');
    }

    if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
      throw new ValidationError('El motivo del ajuste es obligatorio.');
    }

    return await db.withTransaction(async (client) => {
      // 1. Bloquear y verificar el registro de inventario
      const inventario = await inventarioRepository.findByIdForUpdate(inventarioId, client);
      if (!inventario) {
        throw new NotFoundError('El registro de inventario indicado no existe.');
      }

      const stockAnterior = inventario.stock_actual;

      // 2. Validar que el stock nuevo sea distinto al actual
      if (stockNuevoNum === stockAnterior) {
        throw new ValidationError('El stock nuevo es igual al actual');
      }

      // 3. Obtener o asegurar el tipo de movimiento 'Ajuste'
      let tipoMovimiento = await movimientoRepository.getTipoMovimientoByName('Ajuste', client);
      if (!tipoMovimiento) {
        tipoMovimiento = await movimientoRepository.ensureTipoMovimiento(
          'Ajuste',
          'Ajuste de inventario por auditoría o corrección.',
          client
        );
      }

      // 4. Insertar el movimiento tipo Ajuste con el detalle estructurado
      // En Ajuste, cantidad = stockNuevo (el trigger fijará stock_actual = NEW.cantidad)
      const motivoDetalle = `Stock anterior: ${stockAnterior}. Stock nuevo: ${stockNuevoNum}. Motivo: ${motivo.trim()}`;

      const movimiento = await movimientoRepository.createMovimiento(client, {
        inventarioId,
        usuarioId,
        tipoMovimientoId: tipoMovimiento.id,
        cantidad: stockNuevoNum,
        motivoDetalle,
      });

      // 5. Consultar el inventario actualizado
      const inventarioActualizado = await inventarioRepository.findById(inventarioId, client);

      return {
        stock_anterior: stockAnterior,
        inventario: {
          id: inventarioActualizado.id,
          stock_actual: inventarioActualizado.stock_actual,
          stock_minimo: inventarioActualizado.stock_minimo,
          bajo_stock: inventarioActualizado.stock_actual <= inventarioActualizado.stock_minimo,
        },
        movimiento: {
          id: movimiento.id,
          tipo: 'Ajuste',
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo_detalle,
          fecha_movimiento: movimiento.fecha_movimiento,
        },
      };
    });
  }
}

module.exports = new InventarioService();

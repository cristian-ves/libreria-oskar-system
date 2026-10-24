const { sequelize } = require('../../models');
const libroRepository = require('../../repositories/libro.repository');
const bodegaRepository = require('../../repositories/bodega.repository');
const ventaRepository = require('../../repositories/venta.repository');
const movimientoRepository = require('../../repositories/movimiento.repository');
const consulta = require('./consulta.service');
const { bloquearInventariosOrdenados } = require('./bloqueo.helper');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');
const {
  MAX_CENTAVOS, aCentavos, deCentavos, subtotalLinea, codigoVenta,
} = require('../../utils/ventas');

const CLIENTE_POR_DEFECTO = 'Consumidor final';

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

function resolverLibros(items, libros) {
  const porId = new Map(libros.map((l) => [l.id, l]));
  const faltantes = items.filter((i) => !porId.has(i.libroId));
  if (faltantes.length > 0) {
    throw new NotFoundError(`Libro(s) no encontrado(s): ${faltantes.map((i) => i.libroId).join(', ')}.`);
  }

  const inactivos = items.map((i) => porId.get(i.libroId)).filter((libro) => !libro.activo);
  if (inactivos.length > 0) {
    throw new ConflictError(`No se pueden vender libros inactivos: ${inactivos.map((libro) => `«${libro.titulo}»`).join('; ')}.`);
  }

  const sinPrecio = items.map((i) => porId.get(i.libroId)).filter((l) => aCentavos(l.precio) <= 0);
  if (sinPrecio.length > 0) {
    throw new ConflictError(
      `No se pueden vender libros sin precio: ${sinPrecio.map((l) => `«${l.titulo}»`).join('; ')}.`
    );
  }
  return porId;
}

function validarStock(items, libros, inventarios) {
  const stockPorLibro = new Map(inventarios.map((inv) => [inv.libro_id, inv.stock_actual]));
  const afectados = items
    .map((i) => ({ item: i, disponible: stockPorLibro.get(i.libroId) || 0 }))
    .filter(({ item, disponible }) => disponible < item.cantidad)
    .map(({ item, disponible }) =>
      `«${libros.get(item.libroId).titulo}» (disponible ${disponible}, solicitado ${item.cantidad})`);

  if (afectados.length > 0) {
    throw new ConflictError(`Stock insuficiente: ${afectados.join('; ')}`);
  }
}

// Todo el cálculo es en centavos enteros; solo se formatea al persistir.
function calcularImportes(items, libros, descuento) {
  let subtotal = 0;
  const lineas = items.map((i) => {
    const precio = aCentavos(libros.get(i.libroId).precio);
    const subtotalLineaC = subtotalLinea(precio, i.cantidad);
    subtotal += subtotalLineaC;
    if (subtotal > MAX_CENTAVOS) {
      throw new ValidationError('El subtotal de la venta excede el máximo permitido (99999999.99).');
    }
    return { libroId: i.libroId, cantidad: i.cantidad, precio, subtotal: subtotalLineaC };
  });

  const descuentoC = descuento === undefined || descuento === null ? 0 : aCentavos(descuento);
  if (descuentoC > subtotal) {
    throw new ValidationError('El descuento no puede ser mayor que el subtotal de la venta.');
  }
  return { lineas, subtotal, descuento: descuentoC, total: subtotal - descuentoC };
}

module.exports = {
  /**
   * Registra una venta completa en UNA transacción: cabecera, líneas y movimientos de Salida.
   * El precio sale de `libros.precio` leído dentro de la transacción; el vendedor es `usuarioId`.
   * @param {{ bodegaId: string, items: Array<{ libroId: string, cantidad: number }>, metodoPago: string,
   *   clienteNombre?: string, clienteNit?: string, descuento?: number|string, notas?: string, usuarioId: string }} params
   */
  async crearVenta({ bodegaId: bodegaIdEntrada, items: itemsEntrada, metodoPago, clienteNombre, clienteNit, descuento, notas, usuarioId }) {
    // Los UUID de la BD son minúsculas: se normaliza lo recibido para poder compararlo.
    const bodegaId = bodegaIdEntrada.toLowerCase();
    const items = itemsEntrada.map((i) => ({ libroId: i.libroId.toLowerCase(), cantidad: i.cantidad }));

    return sequelize.transaction(async (transaction) => {
      const txOptions = { transaction };

      const bodega = await bodegaRepository.findActivaById(bodegaId, txOptions);
      if (!bodega) {
        throw new NotFoundError('La bodega indicada no existe o está inactiva.');
      }

      // 1. Libros y precios (snapshot leído dentro de la transacción)
      const libroIds = items.map((i) => i.libroId);
      const libros = resolverLibros(items, await libroRepository.findByIdsForUpdate(libroIds, txOptions));

      // 2. Bloqueos en orden fijo por id y 3. validación de stock con lo leído bajo el bloqueo
      const inventarios = await bloquearInventariosOrdenados(libroIds, bodegaId, txOptions);
      validarStock(items, libros, inventarios);

      // 4. Importes en centavos
      const importes = calcularImportes(items, libros, descuento);

      // 5. Cabecera (el número lo asigna la BD) y líneas
      const venta = await ventaRepository.createVenta(txOptions, {
        bodega_id: bodegaId,
        usuario_id: usuarioId,
        cliente_nombre: texto(clienteNombre) || CLIENTE_POR_DEFECTO,
        cliente_nit: texto(clienteNit) || null,
        metodo_pago: metodoPago,
        subtotal: deCentavos(importes.subtotal),
        descuento: deCentavos(importes.descuento),
        total: deCentavos(importes.total),
        notas: texto(notas) || null,
      });
      await ventaRepository.createDetalles(txOptions, importes.lineas.map((l) => ({
        venta_id: venta.id,
        libro_id: l.libroId,
        cantidad: l.cantidad,
        precio_unitario: deCentavos(l.precio),
        subtotal: deCentavos(l.subtotal),
      })));

      // 6. Movimientos de Salida, uno por línea, en el mismo orden de bloqueo (el trigger descuenta el stock)
      let tipoSalida = await movimientoRepository.getTipoMovimientoByName('Salida', txOptions);
      if (!tipoSalida) {
        tipoSalida = await movimientoRepository.ensureTipoMovimiento(
          'Salida',
          'Salida de stock por ventas o transferencias.',
          txOptions
        );
      }
      const cantidadPorLibro = new Map(items.map((i) => [i.libroId, i.cantidad]));
      for (const inv of inventarios) {
        await movimientoRepository.createMovimiento(txOptions, {
          inventarioId: inv.id,
          usuarioId,
          tipoMovimientoId: tipoSalida.id,
          cantidad: cantidadPorLibro.get(inv.libro_id),
          motivoDetalle: `Venta ${codigoVenta(venta.numero)}`,
          ventaId: venta.id,
        });
      }

      return consulta.obtenerVenta(venta.id, txOptions);
    });
  },
};

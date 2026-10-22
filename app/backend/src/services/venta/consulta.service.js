const ventaRepository = require('../../repositories/venta.repository');
const { NotFoundError } = require('../../utils/errors');
const { aCentavos, deCentavos, codigoVenta, rangoFechasNegocio } = require('../../utils/ventas');

// Los importes NUMERIC llegan como string; se normalizan siempre a 2 decimales.
const importe = (valor) => deCentavos(aCentavos(valor));

const usuarioResumen = (u) => (u ? { id: u.id, nombre_completo: u.nombre_completo } : null);

function formatearDetalle(venta) {
  return {
    id: venta.id,
    numero: venta.numero,
    codigo: codigoVenta(venta.numero),
    fecha: venta.creado_en,
    estado: venta.estado,
    bodega: { id: venta.bodega.id, nombre: venta.bodega.nombre },
    vendedor: usuarioResumen(venta.vendedor),
    cliente_nombre: venta.cliente_nombre,
    cliente_nit: venta.cliente_nit,
    metodo_pago: venta.metodo_pago,
    subtotal: importe(venta.subtotal),
    descuento: importe(venta.descuento),
    total: importe(venta.total),
    notas: venta.notas,
    anulada_en: venta.anulada_en,
    anulada_por: usuarioResumen(venta.anulador),
    motivo_anulacion: venta.motivo_anulacion,
    detalles: (venta.detalles || []).map((d) => ({
      libro_id: d.libro_id,
      titulo: d.libro ? d.libro.titulo : null,
      isbn: d.libro ? d.libro.isbn : null,
      cantidad: d.cantidad,
      precio_unitario: importe(d.precio_unitario),
      subtotal: importe(d.subtotal),
    })),
  };
}

function formatearItemListado(venta, agregado) {
  return {
    id: venta.id,
    numero: venta.numero,
    codigo: codigoVenta(venta.numero),
    fecha: venta.creado_en,
    estado: venta.estado,
    cliente_nombre: venta.cliente_nombre,
    metodo_pago: venta.metodo_pago,
    subtotal: importe(venta.subtotal),
    descuento: importe(venta.descuento),
    total: importe(venta.total),
    vendedor_nombre: venta.vendedor ? venta.vendedor.nombre_completo : null,
    bodega_nombre: venta.bodega ? venta.bodega.nombre : null,
    lineas: agregado ? Number(agregado.lineas) : 0,
    unidades: agregado ? Number(agregado.unidades) : 0,
  };
}

module.exports = {
  /**
   * Detalle completo de una venta. Lanza NotFoundError si no existe.
   * @param {string} id
   * @param {{ transaction?: import('sequelize').Transaction }} [options]
   */
  async obtenerVenta(id, options = {}) {
    const venta = await ventaRepository.findDetalleById(id, options);
    if (!venta) {
      throw new NotFoundError('La venta indicada no existe.');
    }
    return formatearDetalle(venta);
  },

  /**
   * Lista paginada de ventas (más recientes primero).
   * `desde` y `hasta` son días YYYY-MM-DD inclusivos en hora de Guatemala.
   * @param {{ estado?: string, desde?: string, hasta?: string, limit?: number|string, offset?: number|string }} params
   */
  async listarVentas({ estado = null, desde = null, hasta = null, limit = 50, offset = 0 } = {}) {
    const lim = Math.min(200, Math.max(1, Number(limit) || 50));
    const off = Math.max(0, Number(offset) || 0);
    const { inicio, finExclusivo } = rangoFechasNegocio(desde, hasta);

    const { total, ventas } = await ventaRepository.findPagina({
      estado: estado || null,
      inicio,
      finExclusivo,
      limit: lim,
      offset: off,
    });

    const agregados = await ventaRepository.contarLineasPorVentas(ventas.map((v) => v.id));
    const porVenta = new Map(agregados.map((a) => [a.venta_id, a]));

    return {
      total,
      limit: lim,
      offset: off,
      ventas: ventas.map((v) => formatearItemListado(v, porVenta.get(v.id))),
    };
  },
};

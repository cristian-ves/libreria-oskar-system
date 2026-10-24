const repository = require('../../repositories/reportes/ventas.repository');
const { respuestaPaginada } = require('./contrato.service');
const { rangoFechasNegocio, codigoVenta } = require('../../utils/ventas');
const { normalizarImporte } = require('./dinero.helper');

module.exports = {
  async generar({ desde = null, hasta = null, estado = null, vendedorId = null, metodoPago = null, limit = 50, offset = 0 }) {
    const { inicio, finExclusivo } = rangoFechasNegocio(desde, hasta);
    const pagina = await repository.ventas({ inicio, finExclusivo, estado, vendedorId, metodoPago, limit: Number(limit), offset: Number(offset) });
    const registros = pagina.rows.map((row) => ({
      id: row.id, numero: row.numero, codigo: codigoVenta(row.numero), fecha: row.fecha,
      vendedor_id: row.vendedor_id, vendedor: row.vendedor, estado: row.estado, metodo_pago: row.metodo_pago,
      subtotal: normalizarImporte(row.subtotal), descuento: normalizarImporte(row.descuento), total: normalizarImporte(row.total),
      anulada_en: row.anulada_en, anulada_por: row.anulada_por, motivo_anulacion: row.motivo_anulacion,
    }));
    return respuestaPaginada({
      filtros: { desde, hasta, estado, vendedorId, metodoPago, zona_horaria: 'America/Guatemala (UTC-06:00)' },
      total: pagina.total, limit: Number(limit), offset: Number(offset), propiedadDatos: 'ventas', datos: registros,
    });
  },
};

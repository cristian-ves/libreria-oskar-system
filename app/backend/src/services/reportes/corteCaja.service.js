const repository = require('../../repositories/reportes/ventas.repository');
const { respuestaPaginada } = require('./contrato.service');
const { rangoFechasNegocio } = require('../../utils/ventas');
const { centavos, normalizarImporte } = require('./dinero.helper');

module.exports = {
  async generar({ fecha }) {
    const { inicio, finExclusivo } = rangoFechasNegocio(fecha, fecha);
    const [estados, porMetodo, porVendedor] = await Promise.all([
      repository.resumenEstado({ inicio, finExclusivo }),
      repository.cortePorMetodo({ inicio, finExclusivo }),
      repository.cortePorVendedor({ inicio, finExclusivo }),
    ]);
    const vigente = estados.find((row) => row.estado === 'Completada') || {};
    const anulada = estados.find((row) => row.estado === 'Anulada') || {};
    const pagos = porMetodo.map((row) => ({ metodo_pago: row.metodo_pago, cantidad: Number(row.cantidad), total: normalizarImporte(row.total) }));
    const vendedores = porVendedor.map((row) => ({ vendedor_id: row.vendedor_id, vendedor: row.vendedor, cantidad: Number(row.cantidad), total: normalizarImporte(row.total) }));
    return respuestaPaginada({
      filtros: { fecha, zona_horaria: 'America/Guatemala (UTC-06:00)' }, total: Number(vigente.cantidad || 0), limit: null, offset: null,
      propiedadDatos: 'ventas_por_metodo_pago', datos: pagos,
      extra: {
        fecha, ventas: { cantidad: Number(vigente.cantidad || 0), bruto: normalizarImporte(vigente.bruto), descuentos: normalizarImporte(vigente.descuentos), neto: normalizarImporte(vigente.neto) },
        totales_por_vendedor: vendedores,
        anuladas: { cantidad: Number(anulada.cantidad || 0), bruto: normalizarImporte(anulada.bruto), descuentos: normalizarImporte(anulada.descuentos), total_original: normalizarImporte(anulada.neto) },
        tipo_corte: 'ventas_diarias; no incluye apertura, efectivo inicial, retiros ni conciliación física de caja',
      },
    });
  },
};

const repository = require('../../repositories/reportes/ventas.repository');
const { rangoFechasNegocio } = require('../../utils/ventas');
const { centavos, variacion } = require('./dinero.helper');
const { deCentavos } = require('../../utils/ventas');

function moverDia(fecha, dias) {
  const date = new Date(`${fecha}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

function resumir(rows) {
  const completadas = rows.find((r) => r.estado === 'Completada') || {};
  const anuladas = rows.find((r) => r.estado === 'Anulada') || {};
  return {
    cantidad_ventas: Number(completadas.cantidad || 0),
    bruto: centavos(completadas.bruto), descuentos: centavos(completadas.descuentos), neto: centavos(completadas.neto),
    anulaciones: { cantidad: Number(anuladas.cantidad || 0), total_original: centavos(anuladas.neto) },
  };
}

function exponer(resumen) {
  return {
    cantidad_ventas: resumen.cantidad_ventas,
    bruto: deCentavos(resumen.bruto),
    descuentos: deCentavos(resumen.descuentos),
    neto: deCentavos(resumen.neto),
    anulaciones: { cantidad: resumen.anulaciones.cantidad, total_original: deCentavos(resumen.anulaciones.total_original) },
  };
}

module.exports = {
  async generar({ desde, hasta }) {
    const actualRango = rangoFechasNegocio(desde, hasta);
    const dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1;
    const anteriorDesde = moverDia(desde, -dias);
    const anteriorHasta = moverDia(desde, -1);
    const anteriorRango = rangoFechasNegocio(anteriorDesde, anteriorHasta);
    const [actualRows, anteriorRows] = await Promise.all([
      repository.resumenEstado(actualRango), repository.resumenEstado(anteriorRango),
    ]);
    const actual = resumir(actualRows);
    const anterior = resumir(anteriorRows);
    return {
      filtros: { desde, hasta, limites_inclusivos: true, zona_horaria: 'America/Guatemala (UTC-06:00)' },
      total: actual.cantidad_ventas, periodo: exponer(actual),
      comparacion: {
        desde: anteriorDesde, hasta: anteriorHasta, periodo: exponer(anterior),
        variacion_neto_porcentaje: variacion(actual.neto, anterior.neto),
        criterio: 'Período inmediatamente anterior con la misma cantidad de días; compara ventas completadas. Si el neto previo es cero y el actual no, la variación es null.',
      },
    };
  },
};

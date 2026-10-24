const { prepararExportacion, TYPE_CONFIG } = require('./reportes.export.service');
const { exportarExcel } = require('./excel.exporter');
const { exportarPdf } = require('./pdf.exporter');
const { MAX_CONCURRENT_EXPORTS } = require('./exportacion.config');
const { AppError } = require('../../../utils/errors');

let exportacionesActivas = 0;

function fechaGuatemala(fecha) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(fecha);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

module.exports = {
  async generar({ tipo, formato, query }) {
    if (exportacionesActivas >= MAX_CONCURRENT_EXPORTS) {
      throw new AppError('Hay demasiadas exportaciones en curso. Intente nuevamente en unos momentos.', 503);
    }
    exportacionesActivas += 1;
    try {
      const maxRegistros = query.maxRegistros === undefined ? undefined : Number(query.maxRegistros);
      const reporte = await prepararExportacion(tipo, query, maxRegistros);
      const buffer = formato === 'xlsx' ? await exportarExcel(reporte) : await exportarPdf(reporte);
      const extension = formato === 'xlsx' ? 'xlsx' : 'pdf';
      const mime = formato === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const filename = `reporte-${TYPE_CONFIG[tipo].slug}-${fechaGuatemala(reporte.fechaGeneracion)}.${extension}`;
      return { buffer, mime, filename };
    } finally {
      exportacionesActivas -= 1;
    }
  },
};

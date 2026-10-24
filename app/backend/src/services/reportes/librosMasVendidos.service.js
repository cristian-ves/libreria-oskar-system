const repository = require('../../repositories/reportes/ventas.repository');
const { respuestaPaginada } = require('./contrato.service');
const { rangoFechasNegocio } = require('../../utils/ventas');
const { normalizarImporte } = require('./dinero.helper');

module.exports = {
  async generar({ desde = null, hasta = null, limit = 10, offset = 0 }) {
    const { inicio, finExclusivo } = rangoFechasNegocio(desde, hasta);
    const pagina = await repository.librosMasVendidos({ inicio, finExclusivo, limit: Number(limit), offset: Number(offset) });
    const registros = pagina.rows.map((row, index) => ({
      posicion: Number(offset) + index + 1,
      libro_id: row.libro_id, titulo: row.titulo, isbn: row.isbn,
      unidades_vendidas: Number(row.unidades_vendidas), ingresos_brutos: normalizarImporte(row.ingresos_brutos),
    }));
    return respuestaPaginada({
      filtros: { desde, hasta, anulaciones: 'excluidas; solo ventas Completada', ingreso: 'suma de subtotales históricos de línea antes del descuento global de cabecera' },
      total: pagina.total, limit: Number(limit), offset: Number(offset), propiedadDatos: 'libros', datos: registros,
    });
  },
};

const repository = require('../../repositories/reportes/stockObsoleto.repository');
const { respuestaPaginada } = require('./contrato.service');

module.exports = {
  listarSucursalesActivas() { return repository.findSucursalesActivas(); },
  async generar({ diasSinVenta = 180, q = null, categoriaId = null, bodegaId = null, sucursalId = null, libroActivo = 'activo', limit = 50, offset = 0 } = {}) {
    const filtros = { diasSinVenta: Number(diasSinVenta), q: q || null, categoriaId: categoriaId || null, bodegaId: bodegaId || null, sucursalId: sucursalId || null, libroActivo };
    const pagina = await repository.findPage({ ...filtros, limit: Number(limit), offset: Number(offset) });
    const registros = pagina.rows.map((row) => ({
      ...row,
      existencias: Number(row.existencias),
      stock_minimo: Number(row.stock_minimo),
      precio_vigente: row.precio_vigente == null ? null : Number(row.precio_vigente),
      dias_sin_rotacion: Number(row.dias_sin_rotacion),
      libro_activo: Boolean(row.libro_activo),
    }));
    return respuestaPaginada({
      filtros,
      total: pagina.total,
      limit: Number(limit),
      offset: Number(offset),
      propiedadDatos: 'registros',
      datos: registros,
      extra: {
        resumen: { existencias_filtradas: pagina.existencias },
        criterio: 'Rotación comercial: ventas completadas por libro y bodega. Las anulaciones y movimientos administrativos no cuentan como ventas; se usa el primer ingreso no asociado a venta y, si falta, la fecha de creación del inventario.',
      },
    });
  },
};

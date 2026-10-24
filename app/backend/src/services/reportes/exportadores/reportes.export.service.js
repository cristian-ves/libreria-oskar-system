const reportesService = require('../../reportes.service');
const { AppError, NotFoundError } = require('../../../utils/errors');
const { aCentavos, deCentavos } = require('../../../utils/ventas');
const { MAX_EXPORT_ROWS, EXPORT_PAGE_SIZE } = require('./exportacion.config');

const PAGE_SIZE = EXPORT_PAGE_SIZE;
const TYPE_CONFIG = {
  'corte-caja': { titulo: 'Corte de caja diario', slug: 'corte-caja', filtros: ['fecha'], metodo: 'generarCorteCaja' },
  'resumen-periodo': { titulo: 'Resumen del período', slug: 'resumen-periodo', filtros: ['desde', 'hasta'], metodo: 'generarResumenPeriodo' },
  'libros-mas-vendidos': { titulo: 'Libros más vendidos', slug: 'libros-mas-vendidos', filtros: ['desde', 'hasta'], metodo: 'generarLibrosMasVendidos', claveFilas: 'libros' },
  reposicion: { titulo: 'Reposición sugerida', slug: 'reposicion', filtros: ['desde', 'hasta', 'bodegaId', 'categoriaId', 'libroId'], metodo: 'generarReposicion', claveFilas: 'registros' },
  'inventario-valorizado': { titulo: 'Inventario valorizado', slug: 'inventario-valorizado', filtros: ['libroId', 'categoriaId', 'bodegaId'], metodo: 'generarInventarioValorizado', claveFilas: 'registros' },
  kardex: { titulo: 'Kardex', slug: 'kardex', filtros: ['libroId', 'categoriaId', 'bodegaId', 'tipo', 'desde', 'hasta'], metodo: 'generarKardex', claveFilas: 'movimientos' },
  ventas: { titulo: 'Listado de ventas', slug: 'ventas', filtros: ['desde', 'hasta', 'estado', 'vendedorId', 'metodoPago'], metodo: 'generarVentas', claveFilas: 'ventas' },
};

const col = (titulo, clave, tipo = 'text', peso) => ({ titulo, clave, tipo, ...(peso ? { peso } : {}) });
const importe = (value) => value == null ? null : deCentavos(aCentavos(String(value)));

function fechaActual() { return new Date(); }

function parametrosFiltrados(tipo, query) {
  const config = TYPE_CONFIG[tipo];
  return Object.fromEntries(config.filtros.filter((key) => query[key] !== undefined).map((key) => [key, query[key]]));
}

async function obtenerTodasLasFilas(service, params, claveFilas, maxRegistros = MAX_EXPORT_ROWS) {
  const primera = await service({ ...params, limit: PAGE_SIZE, offset: 0 });
  const total = Number(primera.total || 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new AppError('No se pudo determinar el tamaño del reporte.', 500);
  if (total > maxRegistros) throw new AppError(`La exportación supera el máximo solicitado de ${maxRegistros} registros. Ajuste los filtros.`, 413);
  const filas = [...(primera[claveFilas] || [])];
  const idClave = { registros: 'inventario_id', movimientos: 'id', ventas: 'id', libros: 'libro_id' }[claveFilas];
  const ids = new Set(filas.map((row) => row[idClave]).filter(Boolean));
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
    const pagina = await service({ ...params, limit: PAGE_SIZE, offset });
    if (Number(pagina.total) !== total) throw new AppError('Los datos del reporte cambiaron durante la exportación. Vuelva a intentarlo.', 409);
    const nuevas = pagina[claveFilas] || [];
    if (nuevas.some((row) => row[idClave] && ids.has(row[idClave]))) {
      throw new AppError('No se pudo mantener un conjunto estable durante la exportación. Vuelva a intentarlo.', 409);
    }
    nuevas.forEach((row) => { if (row[idClave]) ids.add(row[idClave]); });
    filas.push(...nuevas);
  }
  if (filas.length !== total) throw new AppError('No se pudieron recuperar todos los registros del reporte.', 409);
  return { filas, primera, total };
}

function limitarSecciones(secciones, maxRegistros = MAX_EXPORT_ROWS) {
  const total = secciones.reduce((sum, section) => sum + section.filas.length, 0);
  if (total > maxRegistros) throw new AppError(`La exportación supera el máximo solicitado de ${maxRegistros} registros. Ajuste los filtros.`, 413);
}

function filaMetricas(titulo, metricas) {
  return Object.entries(metricas).map(([metrica, valor]) => ({ metrica, valor: valor == null ? null : String(valor) }));
}

async function prepararCorte(params, maxRegistros) {
  const data = await reportesService.generarCorteCaja(params);
  const secciones = [
    { titulo: 'Ventas vigentes', columnas: [col('Ventas', 'cantidad', 'integer'), col('Bruto (Q)', 'bruto', 'money'), col('Descuentos (Q)', 'descuentos', 'money'), col('Neto (Q)', 'neto', 'money')], filas: [{ cantidad: data.ventas.cantidad, bruto: data.ventas.bruto, descuentos: data.ventas.descuentos, neto: data.ventas.neto }] },
    { titulo: 'Por método de pago', columnas: [col('Método de pago', 'metodo_pago'), col('Ventas', 'cantidad', 'integer'), col('Total neto (Q)', 'total', 'money')], filas: data.ventas_por_metodo_pago },
    { titulo: 'Por vendedor', columnas: [col('Vendedor', 'vendedor', 'text', 2.4), col('Ventas', 'cantidad', 'integer'), col('Total neto (Q)', 'total', 'money')], filas: data.totales_por_vendedor },
    { titulo: 'Ventas anuladas (originales)', columnas: [col('Ventas anuladas', 'cantidad', 'integer'), col('Bruto original (Q)', 'bruto', 'money'), col('Descuentos (Q)', 'descuentos', 'money'), col('Total original (Q)', 'total', 'money')], filas: [{ cantidad: data.anuladas.cantidad, bruto: data.anuladas.bruto, descuentos: data.anuladas.descuentos, total: data.anuladas.total_original }] },
  ];
  limitarSecciones(secciones, maxRegistros);
  return { filtros: data.filtros, secciones, notas: [data.tipo_corte, 'Las ventas anuladas no forman parte de los ingresos vigentes.'] };
}

async function prepararResumen(params, maxRegistros) {
  const data = await reportesService.generarResumenPeriodo(params);
  const filasPeriodo = (periodo, fecha, estado) => ({
    periodo: fecha, estado, cantidad_ventas: periodo.cantidad_ventas,
    bruto: periodo.bruto, descuentos: periodo.descuentos, neto: periodo.neto,
    cantidad_anulaciones: periodo.anulaciones.cantidad,
    anulaciones_total: periodo.anulaciones.total_original,
  });
  const rows = [
    filasPeriodo(data.periodo, `${params.desde} a ${params.hasta}`, 'Vigentes'),
    filasPeriodo(data.comparacion.periodo, `${data.comparacion.desde} a ${data.comparacion.hasta}`, 'Comparación anterior'),
  ];
  const secciones = [
    { titulo: 'Período y comparación', columnas: [col('Período', 'periodo', 'text', 2), col('Grupo', 'estado'), col('Ventas vigentes', 'cantidad_ventas', 'integer'), col('Bruto vigente (Q)', 'bruto', 'money'), col('Descuentos vigentes (Q)', 'descuentos', 'money'), col('Neto vigente (Q)', 'neto', 'money'), col('Ventas anuladas', 'cantidad_anulaciones', 'integer'), col('Total original anulado (Q)', 'anulaciones_total', 'money')], filas: rows },
    { titulo: 'Variación', columnas: [col('Indicador', 'metrica'), col('Valor', 'valor')], filas: [{ metrica: 'Variación neta (%)', valor: data.comparacion.variacion_neto_porcentaje }, { metrica: 'Criterio', valor: data.comparacion.criterio }] },
  ];
  limitarSecciones(secciones, maxRegistros);
  return { filtros: data.filtros, secciones, notas: ['Los límites de fecha son inclusivos; comparación con el período anterior de igual duración.'] };
}

async function prepararLibrosMasVendidos(params, maxRegistros) {
  const { filas, primera, total } = await obtenerTodasLasFilas(reportesService.generarLibrosMasVendidos, params, 'libros', maxRegistros);
  const ingresoTotal = filas.reduce((sum, row) => sum + aCentavos(row.ingresos_brutos), 0);
  return {
    filtros: primera.filtros,
    secciones: [
      { titulo: 'Ranking completo', columnas: [col('Posición', 'posicion', 'integer'), col('Título', 'titulo', 'text', 3), col('ISBN', 'isbn'), col('Unidades vendidas', 'unidades_vendidas', 'integer'), col('Ingresos brutos de línea (Q)', 'ingresos_brutos', 'money')], filas },
      { titulo: 'Totales del ranking', columnas: [col('Libros', 'total_libros', 'integer'), col('Unidades vendidas', 'unidades', 'integer'), col('Ingresos brutos (Q)', 'ingresos', 'money')], filas: [{ total_libros: total, unidades: filas.reduce((sum, row) => sum + Number(row.unidades_vendidas), 0), ingresos: deCentavos(ingresoTotal) }] },
    ],
    notas: [primera.filtros.ingreso, 'Solo ventas completadas; se incluyen libros que actualmente estén inactivos.'], total,
  };
}

async function prepararReposicion(params, maxRegistros) {
  const { filas, primera, total } = await obtenerTodasLasFilas(reportesService.generarReposicion, params, 'registros', maxRegistros);
  return {
    filtros: primera.filtros,
    secciones: [
      { titulo: 'Inventario por bodega', columnas: [col('Título', 'titulo', 'text', 2.2), col('ISBN', 'isbn'), col('Categoría', 'categoria'), col('Bodega', 'bodega'), col('Activo', 'libro_activo', 'boolean'), col('Existencias', 'existencias', 'integer'), col('Stock mínimo', 'stock_minimo', 'integer'), col('Unidades vendidas', 'unidades_vendidas_periodo', 'integer'), col('Necesita reposición', 'necesita_reposicion', 'boolean'), col('Cantidad sugerida', 'cantidad_sugerida', 'integer')], filas },
      { titulo: 'Total filtrado', columnas: [col('Inventarios', 'total_inventarios', 'integer')], filas: [{ total_inventarios: total }] },
    ],
    notas: [primera.criterio, 'La cantidad sugerida no está disponible; no se calcula una predicción.'], total,
  };
}

async function prepararInventario(params, maxRegistros) {
  const { filas, primera, total } = await obtenerTodasLasFilas(reportesService.generarInventarioValorizado, params, 'registros', maxRegistros);
  const secciones = [
    { titulo: 'Existencias por bodega', columnas: [col('Título', 'titulo', 'text', 2.1), col('ISBN', 'isbn'), col('Categoría', 'categoria'), col('Bodega', 'bodega'), col('Activo', 'libro_activo', 'boolean'), col('Existencias', 'existencias', 'integer'), col('Costo unitario (Q)', 'costo_unitario', 'money'), col('Valor total (Q)', 'valor_total', 'money')], filas },
    { titulo: 'Resumen general', columnas: [col('Registros', 'registros', 'integer'), col('Existencias', 'existencias', 'integer'), col('Valoración disponible', 'valoracion_disponible', 'boolean'), col('Valor total (Q)', 'valor_total', 'money')], filas: [{ registros: primera.resumen.registros, existencias: primera.resumen.existencias, valoracion_disponible: primera.resumen.valoracion_disponible, valor_total: primera.resumen.valor_total }] },
    { titulo: 'Totales por categoría', columnas: [col('Categoría', 'categoria'), col('Registros', 'registros', 'integer'), col('Existencias', 'existencias', 'integer'), col('Valor total (Q)', 'valor_total', 'money')], filas: primera.totales_por_categoria },
    { titulo: 'Totales por bodega', columnas: [col('Bodega', 'bodega'), col('Registros', 'registros', 'integer'), col('Existencias', 'existencias', 'integer'), col('Valor total (Q)', 'valor_total', 'money')], filas: primera.totales_por_bodega },
  ];
  limitarSecciones(secciones, maxRegistros);
  return { filtros: primera.filtros, secciones, notas: ['El esquema no registra costo de adquisición; el precio de venta no se utiliza como costo.', 'Los campos de costo y valoración se muestran como No disponible.'], total };
}

async function prepararKardex(params, maxRegistros) {
  const { filas, primera, total } = await obtenerTodasLasFilas(reportesService.generarKardex, params, 'movimientos', maxRegistros);
  return {
    filtros: primera.filtros,
    secciones: [
      { titulo: 'Movimientos', columnas: [col('Fecha', 'fecha_movimiento', 'datetime'), col('Tipo', 'tipo'), col('Título', 'titulo', 'text', 2), col('ISBN', 'isbn'), col('Bodega', 'bodega_nombre'), col('Sucursal', 'sucursal_nombre'), col('Cantidad / valor de ajuste', 'cantidad', 'integer'), col('Usuario', 'usuario_nombre'), col('Motivo', 'motivo_detalle', 'text', 2), col('Venta relacionada', 'venta_id')], filas },
      { titulo: 'Total filtrado', columnas: [col('Movimientos', 'total_movimientos', 'integer')], filas: [{ total_movimientos: total }] },
    ],
    notas: ['El saldo histórico por movimiento no está disponible.', 'En movimientos Ajuste, la cantidad es el stock fijado, no un delta. Las filas de anulación y venta se conservan.'], total,
  };
}

async function prepararVentas(params, maxRegistros) {
  const { filas, primera, total } = await obtenerTodasLasFilas(reportesService.generarVentas, params, 'ventas', maxRegistros);
  return {
    filtros: primera.filtros,
    secciones: [
      { titulo: 'Ventas filtradas', columnas: [col('Código', 'codigo'), col('Fecha', 'fecha', 'datetime'), col('Vendedor', 'vendedor', 'text', 2), col('Estado', 'estado'), col('Método de pago', 'metodo_pago'), col('Subtotal (Q)', 'subtotal', 'money'), col('Descuento (Q)', 'descuento', 'money'), col('Total original (Q)', 'total', 'money'), col('Anulada en', 'anulada_en', 'datetime'), col('Motivo de anulación', 'motivo_anulacion', 'text', 2)], filas },
      { titulo: 'Total filtrado', columnas: [col('Ventas', 'total_ventas', 'integer')], filas: [{ total_ventas: total }] },
    ],
    notas: ['Se muestran ventas completadas y anuladas según los filtros. Los importes de una venta anulada son sus importes históricos originales.'], total,
  };
}

const PREPARADORES = {
  'corte-caja': prepararCorte,
  'resumen-periodo': prepararResumen,
  'libros-mas-vendidos': prepararLibrosMasVendidos,
  reposicion: prepararReposicion,
  'inventario-valorizado': prepararInventario,
  kardex: prepararKardex,
  ventas: prepararVentas,
};

async function prepararExportacion(tipo, query, maxRegistros = MAX_EXPORT_ROWS) {
  const config = TYPE_CONFIG[tipo];
  if (!config) throw new NotFoundError('El tipo de reporte indicado no existe.');
  const params = parametrosFiltrados(tipo, query);
  const reporte = await PREPARADORES[tipo](params, maxRegistros);
  return { ...reporte, tipo, titulo: config.titulo, fechaGeneracion: fechaActual(), limiteRegistros: maxRegistros };
}

module.exports = { prepararExportacion, MAX_EXPORT_ROWS, PAGE_SIZE, TYPE_CONFIG };

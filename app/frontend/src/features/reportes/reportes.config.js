export const REPORTES = [
  { id: 'corte-caja', titulo: 'Corte de caja diario', descripcion: 'Ventas completadas, formas de pago, vendedores y anulaciones de un día.', filtros: ['fecha'], datos: 'ventas_por_metodo_pago', limite: null },
  { id: 'resumen-periodo', titulo: 'Resumen del período', descripcion: 'Compara ventas vigentes y anulaciones con el período anterior equivalente.', filtros: ['desde', 'hasta'], datos: null, limite: null },
  { id: 'libros-mas-vendidos', titulo: 'Libros más vendidos', descripcion: 'Ranking por unidades e ingresos históricos de las líneas vendidas.', filtros: ['desde', 'hasta'], datos: 'libros', limite: 10 },
  { id: 'reposicion', titulo: 'Reposición sugerida', descripcion: 'Existencias, mínimos y ventas recientes por libro y bodega.', filtros: ['desde', 'hasta', 'bodegaId', 'categoriaId', 'libroId'], datos: 'registros', limite: 50 },
  { id: 'inventario-valorizado', titulo: 'Inventario valorizado', descripcion: 'Existencias por libro y bodega, con agregados por categoría y bodega.', filtros: ['bodegaId', 'categoriaId', 'libroId'], datos: 'registros', limite: 50 },
  { id: 'kardex', titulo: 'Kardex', descripcion: 'Movimientos históricos con filtros de libro, bodega, tipo y fecha.', filtros: ['desde', 'hasta', 'bodegaId', 'categoriaId', 'libroId', 'tipo'], datos: 'movimientos', limite: 50 },
  { id: 'ventas', titulo: 'Listado de ventas', descripcion: 'Ventas filtradas con importes originales y datos de anulación.', filtros: ['desde', 'hasta', 'estado', 'vendedorId', 'metodoPago'], datos: 'ventas', limite: 50 },
];

export const FILTROS_VACIOS = {
  fecha: '', desde: '', hasta: '', bodegaId: '', categoriaId: '', libroId: '', tipo: '',
  estado: '', vendedorId: '', metodoPago: '',
};

export const COLUMNAS = {
  pagos: [ ['Método de pago', 'metodo_pago'], ['Ventas', 'cantidad', 'number'], ['Total neto', 'total', 'money'] ],
  vendedoresCorte: [ ['Vendedor', 'vendedor'], ['Ventas', 'cantidad', 'number'], ['Total neto', 'total', 'money'] ],
  corte: [ ['Ventas', 'cantidad', 'number'], ['Bruto', 'bruto', 'money'], ['Descuentos', 'descuentos', 'money'], ['Neto', 'neto', 'money'] ],
  anuladas: [ ['Ventas anuladas', 'cantidad', 'number'], ['Bruto original', 'bruto', 'money'], ['Descuentos', 'descuentos', 'money'], ['Total original', 'total_original', 'money'] ],
  periodo: [ ['Indicador', 'indicador'], ['Ventas', 'cantidad_ventas', 'number'], ['Bruto', 'bruto', 'money'], ['Descuentos', 'descuentos', 'money'], ['Neto', 'neto', 'money'], ['Anulaciones', 'anulaciones.cantidad', 'number'], ['Total original anulado', 'anulaciones.total_original', 'money'] ],
  ranking: [ ['Posición', 'posicion', 'number'], ['Libro', 'titulo'], ['ISBN', 'isbn'], ['Unidades', 'unidades_vendidas', 'number'], ['Ingresos brutos de línea', 'ingresos_brutos', 'money'] ],
  reposicion: [ ['Libro', 'titulo'], ['ISBN', 'isbn'], ['Categoría', 'categoria'], ['Bodega', 'bodega'], ['Estado', 'libro_activo', 'active'], ['Existencias', 'existencias', 'number'], ['Stock mínimo', 'stock_minimo', 'number'], ['Vendidas', 'unidades_vendidas_periodo', 'number'], ['Necesita reposición', 'necesita_reposicion', 'boolean'], ['Cantidad sugerida', 'cantidad_sugerida', 'number'] ],
  inventario: [ ['Libro', 'titulo'], ['ISBN', 'isbn'], ['Categoría', 'categoria'], ['Bodega', 'bodega'], ['Estado', 'libro_activo', 'active'], ['Existencias', 'existencias', 'number'], ['Costo unitario', 'costo_unitario', 'money'], ['Valor total', 'valor_total', 'money'] ],
  totalCategoria: [ ['Categoría', 'categoria'], ['Registros', 'registros', 'number'], ['Existencias', 'existencias', 'number'], ['Valor total', 'valor_total', 'money'] ],
  totalBodega: [ ['Bodega', 'bodega'], ['Registros', 'registros', 'number'], ['Existencias', 'existencias', 'number'], ['Valor total', 'valor_total', 'money'] ],
  kardex: [ ['Fecha', 'fecha_movimiento', 'date'], ['Tipo', 'tipo'], ['Libro', 'titulo'], ['ISBN', 'isbn'], ['Bodega', 'bodega_nombre'], ['Sucursal', 'sucursal_nombre'], ['Cantidad / valor de ajuste', 'cantidad', 'number'], ['Usuario', 'usuario_nombre'], ['Motivo', 'motivo_detalle'], ['Venta relacionada', 'venta_id'] ],
  ventas: [ ['Código', 'codigo'], ['Fecha', 'fecha', 'date'], ['Vendedor', 'vendedor'], ['Estado', 'estado'], ['Método de pago', 'metodo_pago'], ['Subtotal', 'subtotal', 'money'], ['Descuento', 'descuento', 'money'], ['Total original', 'total', 'money'], ['Anulada en', 'anulada_en', 'date'], ['Motivo de anulación', 'motivo_anulacion'] ],
};

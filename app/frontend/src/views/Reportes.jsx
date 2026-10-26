import { ShieldCheck } from 'lucide-react';
import ErrorBox from '../components/ui/ErrorBox';
import Paginacion from '../components/ui/Paginacion';
import AccionesExportacion from '../features/reportes/components/AccionesExportacion';
import FiltrosReporte from '../features/reportes/components/FiltrosReporte';
import ResumenReporte from '../features/reportes/components/ResumenReporte';
import SelectorReporte from '../features/reportes/components/SelectorReporte';
import TablaReporte from '../features/reportes/components/TablaReporte';
import useReportes from '../features/reportes/hooks/useReportes';
import { COLUMNAS } from '../features/reportes/reportes.config';
import AccionesStockObsoleto from '../features/reportes/components/AccionesStockObsoleto';

function construirSecciones(tipo, data) {
  if (!data) return [];
  if (tipo === 'corte-caja') return [
    { titulo: 'Ventas vigentes', columnas: COLUMNAS.corte, filas: [data.ventas].filter(Boolean) },
    { titulo: 'Totales por método de pago', columnas: COLUMNAS.pagos, filas: data.ventas_por_metodo_pago || [] },
    { titulo: 'Totales por vendedor', columnas: COLUMNAS.vendedoresCorte, filas: data.totales_por_vendedor || [] },
    { titulo: 'Ventas anuladas (importes originales)', columnas: COLUMNAS.anuladas, filas: [data.anuladas].filter(Boolean) },
  ];
  if (tipo === 'resumen-periodo') return [
    { titulo: 'Período actual', columnas: COLUMNAS.periodo, filas: [{ ...data.periodo, indicador: `${data.filtros?.desde} a ${data.filtros?.hasta}` }] },
    { titulo: 'Período anterior comparable', columnas: COLUMNAS.periodo, filas: [{ ...data.comparacion?.periodo, indicador: `${data.comparacion?.desde} a ${data.comparacion?.hasta}` }] },
  ];
  if (tipo === 'libros-mas-vendidos') return [{ titulo: 'Ranking de libros', columnas: COLUMNAS.ranking, filas: data.libros || [] }];
  if (tipo === 'reposicion') return [{ titulo: 'Existencias y reposición por bodega', columnas: COLUMNAS.reposicion, filas: data.registros || [] }];
  if (tipo === 'inventario-valorizado') return [
    { titulo: 'Inventario por bodega', columnas: COLUMNAS.inventario, filas: data.registros || [] },
    { titulo: 'Totales por categoría', columnas: COLUMNAS.totalCategoria, filas: data.totales_por_categoria || [] },
    { titulo: 'Totales por bodega', columnas: COLUMNAS.totalBodega, filas: data.totales_por_bodega || [] },
  ];
  if (tipo === 'kardex') return [{ titulo: 'Movimientos de inventario', columnas: COLUMNAS.kardex, filas: data.movimientos || [] }];
  if (tipo === 'ventas') return [{ titulo: 'Ventas filtradas', columnas: COLUMNAS.ventas, filas: data.ventas || [] }];
  if (tipo === 'stock-obsoleto') return [{ titulo: 'Inventario sin rotación comercial', columnas: COLUMNAS.stockObsoleto, filas: data.registros || [] }];
  return [];
}

export default function Reportes() {
  const state = useReportes();
  const secciones = construirSecciones(state.tipo, state.datos);
  const errorVisible = state.error || state.errorExportacion;
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <header className="mb-6">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a5b08]"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#e19922]" /><span>Administración</span></div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#252525] sm:text-3xl">Reportes</h1>
      <p className="mt-1 text-sm text-gray-500">Consulta la actividad de ventas e inventario y descarga los resultados.</p>
    </header>

    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(15rem,0.75fr)_minmax(0,2fr)]">
        <SelectorReporte value={state.tipo} onChange={state.cambiarTipo} />
        <div className="flex flex-col justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <AccionesExportacion onExportar={state.exportar} formatoExportando={state.formatoExportando} disabled={Boolean(state.validationError) || state.cargando} />
        </div>
      </div>
      <div><h2 className="text-xl font-extrabold text-[#252525]">{state.reporte.titulo}</h2><p className="mt-1 text-sm text-gray-500">{state.reporte.descripcion}</p></div>

      <FiltrosReporte reporte={state.reporte} filtros={state.filtros} onChange={state.cambiarFiltro} categorias={state.categorias} bodegas={state.bodegas} sucursales={state.sucursales} vendedores={state.vendedores} disabled={state.cargando || Boolean(state.formatoExportando)} busquedaLibro={state.busquedaLibro} setBusquedaLibro={state.setBusquedaLibro} librosDisponibles={state.librosDisponibles} libroSeleccionado={state.libroSeleccionado} seleccionarLibro={state.seleccionarLibro} errorBusquedaLibro={state.errorBusquedaLibro} />
      {state.catalogosError && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="status">No se pudieron cargar algunas opciones de filtro. Puedes consultar sin seleccionar esas opciones o recargar la página.</p>}
      {state.validationError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.validationError}</p>}
      {errorVisible && <div className="space-y-2"><ErrorBox error={errorVisible} /><button type="button" onClick={state.errorExportacion ? () => state.exportar(state.errorExportacion.formato || 'xlsx') : state.recargar} className="min-h-10 rounded-xl bg-[#e19922] px-4 text-sm font-bold text-[#252525] hover:bg-[#b07c19] hover:text-white">{state.errorExportacion ? `Reintentar descarga ${(state.errorExportacion.formato || 'xlsx').toUpperCase()}` : 'Reintentar consulta'}</button></div>}

      {state.datos && !state.cargando && <ResumenReporte tipo={state.tipo} datos={state.datos} />}
      {!state.validationError && <TablaReporte secciones={secciones} cargando={state.cargando} />}
      {state.tipo === 'stock-obsoleto' && !state.cargando && <AccionesStockObsoleto registros={state.datos?.registros || []} onComplete={state.recargar} />}
      {state.reporte.limite && state.datos?.total > 0 && <Paginacion
        paginaActual={state.pagina} totalResultados={state.total} tamanoPagina={state.limit}
        opcionesTamano={state.tipo === 'libros-mas-vendidos' ? [10, 25, 50, 100, 200] : [20, 50, 100, 200]}
        onCambiarPagina={state.cambiarPagina} onCambiarTamano={state.cambiarLimit} cargando={state.cargando}
        etiquetaResultados={state.tipo === 'kardex' ? 'movimientos' : state.tipo === 'ventas' ? 'ventas' : state.tipo === 'libros-mas-vendidos' ? 'libros' : 'registros'}
      />}
    </div>
  </div>;
}

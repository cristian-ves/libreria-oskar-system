import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import useCatalogo from '../features/catalogo/hooks/useCatalogo';
import PanelFiltros from '../features/catalogo/components/PanelFiltros';
import DrawerFiltros from '../features/catalogo/components/DrawerFiltros';
import EtiquetasFiltros from '../features/catalogo/components/EtiquetasFiltros';
import BookGrid from '../features/catalogo/components/BookGrid';
import SinResultados from '../features/catalogo/components/SinResultados';
import Paginacion from '../components/ui/Paginacion';
import { ROLES_OPERATIVOS, puedeAcceder } from '../utils/roles';

export default function Catalogo({ onNavigateToScanner }) {
  const { user, loading: authLoading } = useAuth();
  const puedeRegistrar = puedeAcceder(user, ROLES_OPERATIVOS);
  const {
    libros,
    total,
    limit,
    paginaActual,
    setPagina,
    setTamanoPagina,
    categorias,
    searchTerm,
    setSearchTerm,
    categoriaId,
    loading,
    error,
    sidebarOpen,
    setSidebarOpen,
    hayFiltros,
    totalFiltrosActivos,
    categoriaNombre,
    limpiarFiltros,
    elegirCategoria,
    handleApplySearchFromDrawer,
    handleSelectCategoryWithSearchFromDrawer,
    quitarBusqueda,
    quitarCategoria,
  } = useCatalogo();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-6 lg:pb-8">
      {/* Cajón lateral móvil */}
      <DrawerFiltros
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        searchTerm={searchTerm}
        categoriaId={categoriaId}
        categorias={categorias}
        onApplySearch={handleApplySearchFromDrawer}
        onSelectCategoryWithSearch={handleSelectCategoryWithSearchFromDrawer}
        onLimpiarFiltros={limpiarFiltros}
      />

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col flex-1 overflow-hidden shadow-sm">
            <PanelFiltros
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categorias={categorias}
              categoriaId={categoriaId}
              onElegirCategoria={elegirCategoria}
              onLimpiarFiltros={limpiarFiltros}
              hayFiltros={hayFiltros}
            />
          </div>
        </aside>

        {/* Columna de contenido */}
        <div className="w-full min-w-0">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
                <BookOpen className="w-4 h-4 text-[#e19922]" />
                <span>Catálogo General</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">
                Libros Disponibles
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Explora títulos, autores y existencias consolidadas en todas las bodegas.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Botón "Filtros" móvil */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 bg-white hover:bg-[#b07c19] hover:text-white border border-gray-200 text-[#252525] text-xs font-bold px-3.5 min-h-[44px] rounded-xl transition-all shadow-xs"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtros</span>
                {totalFiltrosActivos > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#e8c85e] text-[#252525] text-[10px] font-bold flex items-center justify-center font-mono">
                    {totalFiltrosActivos}
                  </span>
                )}
              </button>

              {/* Botón "Escanear" */}
              {!authLoading && puedeRegistrar && (
                <button
                  type="button"
                  onClick={onNavigateToScanner}
                  className="inline-flex items-center gap-2 bg-[#e19922] hover:bg-[#b07c19] hover:text-white text-[#252525] text-xs font-bold px-4 min-h-[44px] rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Escanear Nuevo Ejemplar</span>
                </button>
              )}
            </div>
          </div>

          {/* Etiquetas de filtros activos */}
          <EtiquetasFiltros
            searchTerm={searchTerm}
            categoriaNombre={categoriaNombre}
            onQuitarBusqueda={quitarBusqueda}
            onQuitarCategoria={quitarCategoria}
          />

          {/* Contador de resultados */}
          {!loading && (
            <p className="text-xs text-gray-500 mb-4 font-medium">
              {total === 0 ? (
                'Sin resultados'
              ) : categoriaNombre ? (
                <>
                  <span className="text-[#252525] font-bold">{total}</span>
                  {total === 1 ? ' libro' : ' libros'} en{' '}
                  <span className="text-[#b07c19] font-bold">{categoriaNombre}</span>
                </>
              ) : (
                <>
                  <span className="text-[#252525] font-bold">{total}</span>
                  {total === 1 ? ' libro encontrado' : ' libros encontrados'}
                </>
              )}
            </p>
          )}

          {/* Grid de libros con elevación suave en hover */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full min-h-[50vh]">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse p-4 shadow-xs"
                />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="bg-white border border-red-200 rounded-2xl p-8 text-center text-sm text-red-700">
              {error}
            </div>
          ) : libros.length === 0 ? (
            <SinResultados
              searchTerm={searchTerm}
              categoriaNombre={categoriaNombre}
              hayFiltros={hayFiltros}
              onLimpiarFiltros={limpiarFiltros}
              authLoading={authLoading}
              puedeRegistrar={puedeRegistrar}
              onNavigateToScanner={onNavigateToScanner}
            />
          ) : (
            <div className="space-y-5">
              <BookGrid libros={libros} />
              <Paginacion
                paginaActual={paginaActual}
                totalResultados={total}
                tamanoPagina={limit}
                opcionesTamano={[12, 24, 48]}
                onCambiarPagina={setPagina}
                onCambiarTamano={setTamanoPagina}
                cargando={loading}
                etiquetaResultados="libros"
              />
            </div>
          )}

          {/* Footer al final */}
          <div className="mt-12">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

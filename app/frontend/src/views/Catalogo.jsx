import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, BookOpen, User, Tag, Layers, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';

// ── Componentes auxiliares fuera de Catalogo a nivel de módulo ──────────────
function BtnCategoria({ id, label, activo, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full text-left text-xs px-3 rounded-xl transition-all duration-150 min-h-[38px] flex items-center ${
        activo
          ? 'bg-[#e19922] text-[#252525] font-bold shadow-xs'
          : 'text-[#252525] hover:bg-[#b07c19] hover:text-white hover:-translate-y-0.5'
      }`}
    >
      {label}
    </button>
  );
}

function PanelFiltros({
  searchTerm,
  setSearchTerm,
  categorias,
  categoriaId,
  onElegirCategoria,
  onLimpiarFiltros,
  hayFiltros,
}) {
  const ramasDerecho = categorias.filter((c) =>
    c.nombre.toLowerCase().startsWith('derecho')
  );
  const otrasCateg = categorias.filter(
    (c) => !c.nombre.toLowerCase().startsWith('derecho')
  );

  return (
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="relative flex-shrink-0">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Título, autor o ISBN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] placeholder-gray-400 text-xs rounded-xl pl-9 pr-3 py-2.5 min-h-[40px] outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all"
        />
      </div>

      {/* Lista de categorías */}
      <div className="flex-1 overflow-y-auto mt-4 pr-0.5">
        <ul className="flex flex-col gap-1">
          {/* Todas */}
          <li>
            <BtnCategoria
              id={null}
              label="Todas las categorías"
              activo={categoriaId === null}
              onSelect={onElegirCategoria}
            />
          </li>

          {/* Ramas del Derecho */}
          {ramasDerecho.length > 0 && (
            <>
              <li className="pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Ramas del Derecho
                </span>
              </li>
              {ramasDerecho.map((cat) => (
                <li key={cat.id}>
                  <BtnCategoria
                    id={cat.id}
                    label={cat.nombre}
                    activo={categoriaId === cat.id}
                    onSelect={onElegirCategoria}
                  />
                </li>
              ))}
            </>
          )}

          {/* Otras categorías */}
          {otrasCateg.length > 0 && (
            <>
              <li className="pt-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Otras categorías
                </span>
              </li>
              {otrasCateg.map((cat) => (
                <li key={cat.id}>
                  <BtnCategoria
                    id={cat.id}
                    label={cat.nombre}
                    activo={categoriaId === cat.id}
                    onSelect={onElegirCategoria}
                  />
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      {/* Limpiar filtros */}
      {hayFiltros && (
        <div className="flex-shrink-0 pt-3 border-t border-gray-100 mt-2">
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#b07c19] transition-colors min-h-[38px] font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

function DrawerFiltros({
  isOpen,
  onClose,
  searchTerm,
  categoriaId,
  categorias,
  onApplySearch,
  onSelectCategoryWithSearch,
  onLimpiarFiltros,
}) {
  const [draftSearch, setDraftSearch] = useState(searchTerm);

  useEffect(() => {
    if (isOpen) {
      setDraftSearch(searchTerm);
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, searchTerm, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplySearch(draftSearch);
    onClose();
  };

  const ramasDerecho = categorias.filter((c) =>
    c.nombre.toLowerCase().startsWith('derecho')
  );
  const otrasCateg = categorias.filter(
    (c) => !c.nombre.toLowerCase().startsWith('derecho')
  );

  const hayFiltrosEnCajon = draftSearch.trim() !== '' || categoriaId !== null;

  return (
    <div className="lg:hidden">
      {/* Fondo semitransparente */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
        }`}
      />

      {/* Cajón lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm h-screen h-[100dvh] bg-white border-r border-gray-200 flex flex-col transition-all duration-300 transform shadow-xl ${
          isOpen ? 'translate-x-0 visible opacity-100' : '-translate-x-full invisible opacity-0'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Zona superior fija */}
          <div className="p-4 pb-3 border-b border-gray-100 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#b07c19]" />
                <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider">Filtros</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-[#252525] p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Cerrar filtros"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Título, autor o ISBN..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] placeholder-gray-400 text-xs rounded-xl pl-9 pr-3 py-2.5 min-h-[44px] outline-none focus:border-[#b07c19]"
                />
              </div>
              <button
                type="submit"
                className="bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Categorías</p>
            <ul className="flex flex-col gap-1">
              <li>
                <BtnCategoria
                  id={null}
                  label="Todas las categorías"
                  activo={categoriaId === null}
                  onSelect={(id) => onSelectCategoryWithSearch(id, draftSearch)}
                />
              </li>

              {ramasDerecho.length > 0 && (
                <>
                  <li className="pt-3 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Ramas del Derecho
                    </span>
                  </li>
                  {ramasDerecho.map((cat) => (
                    <li key={cat.id}>
                      <BtnCategoria
                        id={cat.id}
                        label={cat.nombre}
                        activo={categoriaId === cat.id}
                        onSelect={(id) => onSelectCategoryWithSearch(id, draftSearch)}
                      />
                    </li>
                  ))}
                </>
              )}

              {otrasCateg.length > 0 && (
                <>
                  <li className="pt-3 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Otras categorías
                    </span>
                  </li>
                  {otrasCateg.map((cat) => (
                    <li key={cat.id}>
                      <BtnCategoria
                        id={cat.id}
                        label={cat.nombre}
                        activo={categoriaId === cat.id}
                        onSelect={(id) => onSelectCategoryWithSearch(id, draftSearch)}
                      />
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>

          {/* Botón Limpiar */}
          <div className="p-4 border-t border-gray-100 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                setDraftSearch('');
                onLimpiarFiltros();
                onClose();
              }}
              disabled={!hayFiltrosEnCajon}
              className="w-full text-center text-xs text-gray-500 hover:text-[#252525] disabled:opacity-40 py-2.5 px-4 rounded-xl border border-gray-200 bg-[#f3f3f3] transition-colors min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function EtiquetasFiltros({ searchTerm, categoriaNombre, onQuitarBusqueda, onQuitarCategoria }) {
  const tieneBusqueda = searchTerm.trim() !== '';
  const tieneCategoria = Boolean(categoriaNombre);

  if (!tieneBusqueda && !tieneCategoria) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {tieneBusqueda && (
        <span className="inline-flex items-center gap-1.5 text-xs bg-white text-[#252525] border border-gray-200 px-3 py-1 rounded-xl shadow-xs">
          <span className="text-gray-500 font-medium text-[11px]">Búsqueda:</span>
          <span className="font-bold text-[#252525]">"{searchTerm.trim()}"</span>
          <button
            type="button"
            onClick={onQuitarBusqueda}
            title="Quitar filtro de búsqueda"
            className="text-gray-400 hover:text-red-500 ml-0.5 p-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {tieneCategoria && (
        <span className="inline-flex items-center gap-1.5 text-xs bg-[#e8c85e] text-[#252525] px-3 py-1 rounded-xl shadow-xs font-semibold">
          <span className="text-[#252525]/70 font-medium text-[11px]">Categoría:</span>
          <span>{categoriaNombre}</span>
          <button
            type="button"
            onClick={onQuitarCategoria}
            title="Quitar filtro de categoría"
            className="text-[#252525]/80 hover:text-red-600 ml-0.5 p-0.5 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
}

export default function Catalogo({ onNavigateToScanner }) {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [libros, setLibros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [categoriaId, setCategoriaId] = useState(() => searchParams.get('categoriaId') || null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/categorias')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setCategorias(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const nextParams = {};
        if (searchTerm.trim()) nextParams.q = searchTerm.trim();
        if (categoriaId) nextParams.categoriaId = categoriaId;
        setSearchParams(nextParams, { replace: true });

        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        if (categoriaId) params.set('categoriaId', categoriaId);
        const qs = params.toString();
        const url = qs ? `/api/libros?${qs}` : '/api/libros';

        const res = await fetch(url);
        if (!cancelled && res.ok) {
          const json = await res.json();
          setLibros(json.data || []);
        }
      } catch (err) {
        if (!cancelled) console.error('[CATALOG ERROR]:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, categoriaId, setSearchParams]);

  const hayFiltros = searchTerm.trim() !== '' || categoriaId !== null;
  const totalFiltrosActivos = (searchTerm.trim() !== '' ? 1 : 0) + (categoriaId !== null ? 1 : 0);

  const limpiarFiltros = useCallback(() => {
    setSearchTerm('');
    setCategoriaId(null);
  }, []);

  const elegirCategoria = useCallback((id) => {
    setCategoriaId(id);
  }, []);

  const handleApplySearchFromDrawer = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategoryWithSearchFromDrawer = useCallback((catId, draftTerm) => {
    setCategoriaId(catId);
    setSearchTerm(draftTerm);
    setSidebarOpen(false);
  }, []);

  const quitarBusqueda = useCallback(() => {
    setSearchTerm('');
  }, []);

  const quitarCategoria = useCallback(() => {
    setCategoriaId(null);
  }, []);

  const categoriaNombre = categoriaId
    ? (categorias.find((c) => c.id === categoriaId)?.nombre ?? '')
    : '';

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
                className="lg:hidden inline-flex items-center gap-2 bg-white hover:bg-[#b07c19] hover:text-white border border-gray-200 text-[#252525] text-xs font-bold px-3.5 min-h-[40px] rounded-xl transition-all shadow-xs"
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
              {!authLoading && user && (
                <button
                  type="button"
                  onClick={onNavigateToScanner}
                  className="inline-flex items-center gap-2 bg-[#e19922] hover:bg-[#b07c19] hover:text-white text-[#252525] text-xs font-bold px-4 min-h-[40px] rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
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
              {libros.length === 0 ? (
                'Sin resultados'
              ) : categoriaNombre ? (
                <>
                  <span className="text-[#252525] font-bold">{libros.length}</span>
                  {libros.length === 1 ? ' libro' : ' libros'} en{' '}
                  <span className="text-[#b07c19] font-bold">{categoriaNombre}</span>
                </>
              ) : (
                <>
                  <span className="text-[#252525] font-bold">{libros.length}</span>
                  {libros.length === 1 ? ' libro encontrado' : ' libros encontrados'}
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
          ) : libros.length === 0 ? (
            <div className="w-full min-h-[50vh] flex items-center justify-center">
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center w-full shadow-sm">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#252525] mb-1">
                  No se encontraron libros
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  {searchTerm && categoriaNombre
                    ? `No hay coincidencias para "${searchTerm}" en ${categoriaNombre}.`
                    : searchTerm
                    ? `No hay coincidencias para "${searchTerm}".`
                    : categoriaNombre
                    ? `No hay libros registrados en ${categoriaNombre}.`
                    : 'Aún no se han registrado libros en el inventario.'}
                </p>
                {hayFiltros ? (
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="text-xs font-bold text-[#b07c19] hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                ) : (
                  !authLoading && user && (
                    <button
                      type="button"
                      onClick={onNavigateToScanner}
                      className="text-xs font-bold text-[#b07c19] hover:underline cursor-pointer"
                    >
                      Ir a Registrar Libro con Escáner →
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {libros.map((libro) => (
                <Link
                  key={libro.id}
                  to={`/catalogo/${libro.ref || libro.id}`}
                  className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07c19] flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-28 bg-[#f3f3f3] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                        {libro.imagen_url ? (
                          <img
                            src={libro.imagen_url}
                            alt={libro.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Etiqueta ISBN */}
                        {libro.isbn && (
                          <span className="text-[10px] font-mono text-[#b07c19] bg-[#f3f3f3] px-2 py-0.5 rounded-md border border-gray-200 font-semibold">
                            {libro.isbn}
                          </span>
                        )}
                        <h3 className="font-bold text-[#252525] text-sm mt-1.5 line-clamp-2 leading-snug">
                          {libro.titulo}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{libro.autor_nombre || 'Desconocido'}</span>
                        </p>
                        {/* Etiqueta de categoría */}
                        {libro.categoria_nombre && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-600 bg-[#f3f3f3] px-2 py-0.5 rounded-md border border-gray-200 font-medium">
                            <Tag className="w-2.5 h-2.5 text-[#b07c19]" />
                            {libro.categoria_nombre}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {libro.resena}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#b07c19] font-mono font-bold">
                      <Layers className="w-3.5 h-3.5 text-[#e19922]" />
                      <span>Stock Total: {libro.stock_total || 0}</span>
                    </div>
                    <span className="font-bold text-[#252525]">
                      {Number(libro.precio) > 0
                        ? 'Q ' + Number(libro.precio).toFixed(2)
                        : 'Precio por confirmar'}
                    </span>
                  </div>
                </Link>
              ))}
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

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, User, Tag, Layers, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Catalogo({ onNavigateToScanner }) {
  const { user, loading: authLoading } = useAuth();

  const [libros, setLibros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Carga de categorías al montar (fallo silencioso) ──────────────────────
  useEffect(() => {
    fetch('/api/categorias')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setCategorias(json.data || []))
      .catch(() => {
        // La sidebar sigue funcionando sin categorías
      });
  }, []);

  // ── Búsqueda con debounce 300 ms + bandera de cancelación ─────────────────
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
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
  }, [searchTerm, categoriaId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hayFiltros = searchTerm.trim() !== '' || categoriaId !== null;

  const limpiarFiltros = () => {
    setSearchTerm('');
    setCategoriaId(null);
  };

  const elegirCategoria = (id) => {
    setCategoriaId(id);
    setSidebarOpen(false); // cierra panel móvil al elegir
  };

  const categoriaNombre = categoriaId
    ? (categorias.find((c) => c.id === categoriaId)?.nombre ?? '')
    : '';

  // ── Grupos de categorías ──────────────────────────────────────────────────
  const ramasDerecho = categorias.filter((c) =>
    c.nombre.toLowerCase().startsWith('derecho')
  );
  const otrasCateg = categorias.filter(
    (c) => !c.nombre.toLowerCase().startsWith('derecho')
  );

  // ── Botón de categoría (reutilizable) ─────────────────────────────────────
  const BtnCategoria = ({ id, label }) => (
    <button
      onClick={() => elegirCategoria(id)}
      className={`w-full text-left text-xs px-3 rounded-lg transition-all min-h-[40px] flex items-center ${
        categoriaId === id
          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
          : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );

  // ── Lista de categorías dividida en secciones ──────────────────────────────
  const ListaCategorias = () => (
    <ul className="flex flex-col gap-0.5">
      {/* Todas */}
      <li>
        <BtnCategoria id={null} label="Todas" />
      </li>

      {/* Ramas del Derecho */}
      {ramasDerecho.length > 0 && (
        <>
          <li className="pt-3 pb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Ramas del Derecho
            </span>
          </li>
          {ramasDerecho.map((cat) => (
            <li key={cat.id}>
              <BtnCategoria id={cat.id} label={cat.nombre} />
            </li>
          ))}
        </>
      )}

      {/* Otras categorías */}
      {otrasCateg.length > 0 && (
        <>
          <li className="pt-3 pb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Otras categorías
            </span>
          </li>
          {otrasCateg.map((cat) => (
            <li key={cat.id}>
              <BtnCategoria id={cat.id} label={cat.nombre} />
            </li>
          ))}
        </>
      )}
    </ul>
  );

  // ── Panel de filtros completo (sidebar desktop y panel móvil) ──────────────
  const PanelFiltros = () => (
    <div className="flex flex-col h-full">
      {/* Buscador — fijo arriba */}
      <div className="relative flex-shrink-0">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Título, autor o ISBN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-2.5 min-h-[40px] outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      </div>

      {/* Lista de categorías — scrollable, ocupa el espacio restante */}
      <div className="flex-1 overflow-y-auto mt-4 pr-0.5">
        <ListaCategorias />
      </div>

      {/* Limpiar filtros — fijo abajo */}
      {hayFiltros && (
        <div className="flex-shrink-0 pt-3 border-t border-slate-800/60 mt-2">
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors min-h-[40px]"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Catálogo General</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Libros Disponibles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explora títulos, autores y existencias consolidadas en todas las bodegas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón "Filtros" — solo visible en móvil */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold px-3 min-h-[40px] rounded-xl transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hayFiltros && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>

          {/* Botón "Escanear" — solo cuando hay sesión y AuthContext terminó de cargar */}
          {!authLoading && user && (
            <button
              onClick={onNavigateToScanner}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 min-h-[40px] rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <span>Escanear Nuevo Ejemplar</span>
            </button>
          )}
        </div>
      </div>

      {/* Panel móvil de filtros */}
      {sidebarOpen && (
        <div className="lg:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-white">Filtros</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <PanelFiltros />
        </div>
      )}

      {/* Layout principal — grid de dos columnas en lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">

        {/* Sidebar — solo visible en lg+ */}
        <aside className="hidden lg:flex flex-col sticky top-[4rem] h-[calc(100vh-4rem)]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col flex-1 overflow-hidden">
            <PanelFiltros />
          </div>
        </aside>

        {/* Columna de contenido — ancho estable */}
        <div className="w-full min-w-0">
          {/* Contador de resultados */}
          {!loading && (
            <p className="text-xs text-slate-400 mb-4">
              {libros.length === 0 ? (
                'Sin resultados'
              ) : categoriaNombre ? (
                <>
                  <span className="text-white font-semibold">{libros.length}</span>
                  {libros.length === 1 ? ' libro' : ' libros'} en{' '}
                  <span className="text-emerald-400 font-semibold">{categoriaNombre}</span>
                </>
              ) : (
                <>
                  <span className="text-white font-semibold">{libros.length}</span>
                  {libros.length === 1 ? ' libro encontrado' : ' libros encontrados'}
                </>
              )}
            </p>
          )}

          {/* Estados: cargando / vacío / grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full min-h-[50vh]">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse p-4"
                />
              ))}
            </div>
          ) : libros.length === 0 ? (
            <div className="w-full min-h-[50vh] flex items-center justify-center">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center w-full">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white mb-1">
                  No se encontraron libros
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
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
                    onClick={limpiarFiltros}
                    className="text-xs font-bold text-emerald-400 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                ) : (
                  /* Enlace al escáner solo si hay sesión y AuthContext terminó */
                  !authLoading && user && (
                    <button
                      onClick={onNavigateToScanner}
                      className="text-xs font-bold text-emerald-400 hover:underline"
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
                <div
                  key={libro.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-28 bg-slate-950 rounded-lg overflow-hidden flex-shrink-0 border border-slate-800 flex items-center justify-center">
                        {libro.imagen_url ? (
                          <img
                            src={libro.imagen_url}
                            alt={libro.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <BookOpen className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Etiqueta ISBN: se oculta si es nulo o vacío */}
                        {libro.isbn && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {libro.isbn}
                          </span>
                        )}
                        <h3 className="font-bold text-white text-sm mt-1.5 line-clamp-2 leading-snug">
                          {libro.titulo}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{libro.autor_nombre || 'Desconocido'}</span>
                        </p>
                        {/* Etiqueta de categoría */}
                        {libro.categoria_nombre && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            <Tag className="w-2.5 h-2.5" />
                            {libro.categoria_nombre}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {libro.resena}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Stock Total: {libro.stock_total || 0}</span>
                    </div>
                    <span className="font-semibold text-white">
                      {Number(libro.precio) > 0
                        ? 'Q ' + Number(libro.precio).toFixed(2)
                        : 'Precio por confirmar'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

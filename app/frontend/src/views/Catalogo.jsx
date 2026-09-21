import React, { useState, useEffect } from 'react';
import { Search, BookOpen, User, Building2, Tag, Layers, RefreshCw } from 'lucide-react';

export default function Catalogo({ onNavigateToScanner }) {
  const [libros, setLibros] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Búsqueda con debounce en tiempo real
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      cargarLibros(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const cargarLibros = async (query = '') => {
    try {
      setLoading(true);
      const url = query.trim()
        ? `/api/libros?q=${encodeURIComponent(query.trim())}`
        : '/api/libros';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLibros(json.data || []);
      }
    } catch (err) {
      console.error('[CATALOG ERROR]:', err);
    } finally {
      setLoading(false);
    }
  };

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

        <button
          onClick={onNavigateToScanner}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <span>Escanear Nuevo Ejemplar</span>
        </button>
      </div>

      {/* Barra de Búsqueda con Debounce */}
      <div className="mb-6 relative max-w-lg">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por título, autor o ISBN en tiempo real..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      </div>

      {/* Grid de Libros */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse p-4" />
          ))}
        </div>
      ) : libros.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No se encontraron libros</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm
              ? `No hay coincidencias para "${searchTerm}".`
              : 'Aún no se han registrado libros en el inventario.'}
          </p>
          <button
            onClick={onNavigateToScanner}
            className="text-xs font-bold text-emerald-400 hover:underline"
          >
            Ir a Registrar Libro con Escáner →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {libro.isbn}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1.5 line-clamp-2 leading-snug">
                      {libro.titulo}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{libro.autor_nombre || 'Desconocido'}</span>
                    </p>
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
                  Q {Number(libro.precio).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

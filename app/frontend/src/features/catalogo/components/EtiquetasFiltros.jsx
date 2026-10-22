import { X } from 'lucide-react';

export default function EtiquetasFiltros({ searchTerm, categoriaNombre, onQuitarBusqueda, onQuitarCategoria }) {
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

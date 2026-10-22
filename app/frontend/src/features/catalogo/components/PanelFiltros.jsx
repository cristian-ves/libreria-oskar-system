import { Search, X } from 'lucide-react';
import BtnCategoria from './BtnCategoria';

export default function PanelFiltros({
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

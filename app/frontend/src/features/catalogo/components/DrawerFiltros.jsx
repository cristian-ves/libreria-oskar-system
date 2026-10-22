import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import BtnCategoria from './BtnCategoria';

export default function DrawerFiltros({
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

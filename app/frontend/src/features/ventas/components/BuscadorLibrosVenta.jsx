import { Search } from 'lucide-react';
import Input from '../../../components/ui/Input';
import ErrorBox from '../../../components/ui/ErrorBox';
import { aCentavos, formatQuetzales } from '../../../utils/dinero';

function motivoBloqueo(libro, agregado) {
  if (agregado) return 'En la venta';
  if (!(aCentavos(libro.precio) > 0)) return 'Sin precio';
  if (!(libro.stock_total > 0)) return 'Sin stock';
  return null;
}

export default function BuscadorLibrosVenta({ busqueda, setBusqueda, resultados, buscando, error, lineas, onAgregar }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar libro por título, autor o ISBN..."
          className="pl-9"
        />
      </div>

      <ErrorBox error={error} />
      {buscando && <p className="text-xs text-gray-500 font-medium">Buscando...</p>}
      {!buscando && busqueda.trim() && !error && resultados.length === 0 && (
        <p className="text-xs text-gray-500 font-medium">No se encontraron libros.</p>
      )}

      {resultados.length > 0 && (
        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {resultados.map((libro) => {
            const bloqueo = motivoBloqueo(libro, lineas.some((l) => l.libroId === libro.id));
            return (
              <li key={libro.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#252525] text-sm truncate">{libro.titulo}</p>
                  <p className="text-[11px] text-gray-500 truncate">{libro.autor_nombre || 'Autor desconocido'}</p>
                  <p className="text-[10px] font-mono text-gray-400">
                    {libro.isbn ? `ISBN: ${libro.isbn} · ` : ''}
                    {formatQuetzales(aCentavos(libro.precio) ?? 0)} · Stock: {libro.stock_total}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(bloqueo)}
                  onClick={() => onAgregar(libro)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white disabled:bg-[#f3f3f3] disabled:text-gray-400 disabled:border disabled:border-gray-200 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {bloqueo || 'Agregar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

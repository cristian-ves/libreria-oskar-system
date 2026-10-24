import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginacion({
  paginaActual,
  totalResultados,
  tamanoPagina,
  opcionesTamano = [12, 24, 48],
  onCambiarPagina,
  onCambiarTamano,
  cargando = false,
  etiquetaResultados = 'resultados',
}) {
  const paginasTotales = Math.ceil(totalResultados / tamanoPagina);
  const paginaVisible = totalResultados === 0 ? 0 : Math.min(paginaActual, paginasTotales);
  const desde = totalResultados === 0 ? 0 : ((paginaVisible - 1) * tamanoPagina) + 1;
  const hasta = Math.min(paginaVisible * tamanoPagina, totalResultados);
  const anteriorDeshabilitado = cargando || paginaActual <= 1 || totalResultados === 0;
  const siguienteDeshabilitado = cargando || paginaActual >= paginasTotales || totalResultados === 0;

  return (
    <nav
      aria-label={`Paginación de ${etiquetaResultados}`}
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
    >
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
        <span className="text-gray-500 font-medium" aria-live="polite">
          Mostrando <strong className="text-[#252525]">{desde}–{hasta}</strong> de{' '}
          <strong className="text-[#252525]">{totalResultados}</strong> {etiquetaResultados}
        </span>
        <label className="flex items-center gap-2 text-gray-600 font-medium">
          <span>Por página</span>
          <select
            value={tamanoPagina}
            disabled={cargando}
            onChange={(event) => onCambiarTamano(Number(event.target.value))}
            className="min-h-[44px] rounded-lg border border-gray-200 bg-[#f3f3f3] px-2 text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#b07c19] disabled:opacity-50"
            aria-label={`Resultados por página de ${etiquetaResultados}`}
          >
            {opcionesTamano.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-600" aria-current="page">
          Página {paginaVisible} de {paginasTotales}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCambiarPagina(Math.max(1, paginaActual - 1))}
            disabled={anteriorDeshabilitado}
            aria-label="Ir a la página anterior"
            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            onClick={() => onCambiarPagina(Math.min(paginasTotales, paginaActual + 1))}
            disabled={siguienteDeshabilitado}
            aria-label="Ir a la página siguiente"
            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}

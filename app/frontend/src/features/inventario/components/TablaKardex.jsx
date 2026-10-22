import { Filter, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFecha } from '../../../utils/formatters';
import { KARDEX_LIMIT } from '../hooks/useKardex';
import TipoBadge from './TipoBadge';

export default function TablaKardex({
  bodegas,
  movimientos,
  totalMovimientos,
  loadingKardex,
  kardexTipo,
  setKardexTipo,
  kardexBodega,
  setKardexBodega,
  kardexLibroId,
  kardexLibroTitulo,
  kardexOffset,
  setKardexOffset,
  limpiarFiltroLibroKardex,
}) {
  return (
    <div className="space-y-5">
      {/* Banner filtrado por libro */}
      {kardexLibroId && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#b07c19]" />
            <span>
              Filtrado por libro: <strong className="text-[#252525] font-bold">{kardexLibroTitulo}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={limpiarFiltroLibroKardex}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-red-600 bg-white px-2.5 py-1 rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs font-semibold"
          >
            <X className="w-3.5 h-3.5" />
            <span>Quitar filtro</span>
          </button>
        </div>
      )}

      {/* Barra de Filtros de Kardex */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Chips de tipo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: '', label: 'Todos' },
            { id: 'Ingreso', label: 'Ingresos' },
            { id: 'Salida', label: 'Salidas' },
            { id: 'Ajuste', label: 'Ajustes' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setKardexTipo(chip.id);
                setKardexOffset(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                kardexTipo === chip.id
                  ? 'bg-[#e19922] text-[#252525] shadow-xs'
                  : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Dropdown de Bodega */}
        <select
          value={kardexBodega}
          onChange={(e) => {
            setKardexBodega(e.target.value);
            setKardexOffset(0);
          }}
          className="w-full sm:w-56 bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#b07c19] transition-all cursor-pointer font-medium"
        >
          <option value="">Todas las bodegas</option>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre} {b.sucursal_nombre ? `(${b.sucursal_nombre})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Movimientos */}
      {loadingKardex ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-medium">Cargando movimientos del kardex...</p>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252525] mb-1">No hay movimientos registrados</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No se encontraron registros en el kardex con los filtros aplicados.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4 text-center">Cantidad</th>
                  <th className="py-3.5 px-4">Libro</th>
                  <th className="py-3.5 px-4">Bodega</th>
                  <th className="py-3.5 px-4">Operador</th>
                  <th className="py-3.5 px-4">Motivo / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {formatFecha(m.fecha_movimiento)}
                    </td>
                    <td className="py-3 px-4">
                      <TipoBadge tipo={m.tipo} />
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-[#252525] text-sm">
                      {m.tipo?.toLowerCase() === 'salida' ? `-${m.cantidad}` : `+${m.cantidad}`}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#252525] truncate max-w-xs">{m.titulo}</p>
                      {m.isbn && <p className="text-[10px] font-mono text-gray-400 font-medium">ISBN: {m.isbn}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#252525]">{m.bodega_nombre}</p>
                      <p className="text-[10px] text-gray-500">{m.sucursal_nombre}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-medium">
                      {m.usuario_nombre || 'Sistema'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate text-[11px]">
                      {m.motivo_detalle || 'Sin detalle'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden space-y-3">
            {movimientos.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <TipoBadge tipo={m.tipo} />
                  <span className="font-mono text-xs text-gray-500">
                    {formatFecha(m.fecha_movimiento)}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-[#252525] text-sm leading-snug">{m.titulo}</h4>
                  <p className="text-[11px] font-mono text-gray-500">{m.bodega_nombre} · Cantidad: <strong className="text-[#252525]">{m.cantidad}</strong></p>
                </div>

                {m.motivo_detalle && (
                  <p className="text-xs text-gray-600 bg-[#f3f3f3] p-2 rounded-xl border border-gray-200">
                    {m.motivo_detalle}
                  </p>
                )}

                <div className="text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-100 flex justify-between">
                  <span>Operador: {m.usuario_nombre || 'Sistema'}</span>
                  {m.isbn && <span>ISBN: {m.isbn}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-500 font-medium">
              Mostrando{' '}
              <strong className="text-[#252525]">
                {totalMovimientos === 0 ? 0 : kardexOffset + 1}
              </strong>
              –
              <strong className="text-[#252525]">
                {Math.min(kardexOffset + KARDEX_LIMIT, totalMovimientos)}
              </strong>{' '}
              de <strong className="text-[#252525]">{totalMovimientos}</strong> movimientos
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setKardexOffset((prev) => Math.max(0, prev - KARDEX_LIMIT))}
                disabled={kardexOffset === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:text-[#252525] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setKardexOffset((prev) => prev + KARDEX_LIMIT)}
                disabled={kardexOffset + KARDEX_LIMIT >= totalMovimientos}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:text-[#252525] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { Search, X, Package, BookOpen } from 'lucide-react';
import { formatFecha } from '../../../utils/formatters';
import EstadoBadge from './EstadoBadge';
import Paginacion from '../../../components/ui/Paginacion';

export default function TablaExistencias({
  bodegas,
  existencias,
  totalExistencias,
  loadingExistencias,
  existenciasLimit,
  paginaExistencias,
  setPaginaExistencias,
  setTamanoPaginaExistencias,
  estadoFilter,
  setEstadoFilter,
  searchInput,
  setSearchInput,
  selectedBodega,
  setSelectedBodega,
  abrirModalSalida,
  abrirModalAjuste,
  handleVerKardex,
}) {
  return (
    <div className="space-y-5">
      {/* Barra de Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Chips de estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'en_stock', label: 'En stock' },
            { id: 'bajo_stock', label: 'Bajo stock' },
            { id: 'obsoleto', label: 'Sin salidas' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setEstadoFilter(chip.id)}
              className={`min-h-11 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19] ${
                estadoFilter === chip.id
                  ? 'bg-[#e19922] text-[#252525] shadow-xs'
                  : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Buscador y Dropdown de Bodega */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Buscar existencias por título, autor o ISBN"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar título, autor, ISBN..."
              className="w-full min-h-11 bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl pl-9 pr-12 py-2 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all placeholder:text-gray-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#252525] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b07c19]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedBodega}
            onChange={(e) => setSelectedBodega(e.target.value)}
            aria-label="Filtrar existencias por bodega"
            className="w-full min-h-11 sm:w-52 bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all cursor-pointer font-medium"
          >
            <option value="">Todas las bodegas</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre} {b.sucursal_nombre ? `(${b.sucursal_nombre})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listado de Existencias */}
      {loadingExistencias ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-medium">Cargando existencias...</p>
        </div>
      ) : existencias.length === 0 ? (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#252525] mb-1">No se encontraron existencias</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No hay registros que coincidan con los filtros aplicados.
            </p>
          </div>
          <Paginacion
            paginaActual={paginaExistencias}
            totalResultados={totalExistencias}
            tamanoPagina={existenciasLimit}
            opcionesTamano={[20, 50, 100]}
            onCambiarPagina={setPaginaExistencias}
            onCambiarTamano={setTamanoPaginaExistencias}
            cargando={loadingExistencias}
            etiquetaResultados="existencias"
          />
        </div>
      ) : (
        <>
          {/* Tabla para pantallas grandes */}
          <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Libro / Detalles</th>
                  <th className="py-3.5 px-4">Bodega / Sucursal</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4">Última Salida</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {existencias.map((item) => (
                  <tr key={item.inventario_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.imagen_url ? (
                          <img
                            src={item.imagen_url}
                            alt={item.titulo}
                            className="w-9 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-9 h-12 rounded-lg bg-[#f3f3f3] border border-gray-200 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#252525] truncate max-w-xs">{item.titulo}</p>
                          <p className="text-[11px] text-gray-500 truncate max-w-xs">{item.autor || 'Autor desconocido'}</p>
                          {item.isbn && (
                            <p className="text-[10px] font-mono text-gray-400 font-medium">ISBN: {item.isbn}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#252525]">{item.bodega_nombre}</p>
                      <p className="text-[11px] text-gray-500">{item.sucursal_nombre || 'Sucursal Principal'}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono text-sm font-extrabold ${
                        item.stock_actual <= item.stock_minimo ? 'text-amber-600' : 'text-[#252525]'
                      }`}>
                        {item.stock_actual}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono"> / mín {item.stock_minimo}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {formatFecha(item.ultima_salida)}
                    </td>
                    <td className="py-3 px-4">
                      <EstadoBadge bajo_stock={item.bajo_stock} obsoleto={item.obsoleto} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirModalSalida(item)}
                          title="Registrar salida"
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                        >
                          Salida
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModalAjuste(item)}
                          title="Ajustar stock"
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#b07c19] text-white hover:bg-[#e19922] hover:text-[#252525] transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                        >
                          Ajuste
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerKardex(item)}
                          title="Ver historial de movimientos"
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#f3f3f3] text-[#252525] hover:bg-gray-200 border border-gray-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                        >
                          Kardex
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas apiladas para móvil */}
          <div className="lg:hidden space-y-3">
            {existencias.map((item) => (
              <div
                key={item.inventario_id}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3"
              >
                <div className="flex gap-3">
                  {item.imagen_url && (
                    <img
                      src={item.imagen_url}
                      alt={item.titulo}
                      className="w-12 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[#252525] text-sm leading-snug line-clamp-2">{item.titulo}</h4>
                    <p className="text-xs text-gray-500 truncate">{item.autor || 'Autor desconocido'}</p>
                    <p className="text-[11px] font-mono text-gray-400">{item.bodega_nombre} · {item.sucursal_nombre}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">Stock: </span>
                    <span className={`font-mono font-bold ${
                      item.stock_actual <= item.stock_minimo ? 'text-amber-600' : 'text-[#252525]'
                    }`}>
                      {item.stock_actual}
                    </span>
                    <span className="text-gray-400 font-mono"> (mín {item.stock_minimo})</span>
                  </div>
                  <EstadoBadge bajo_stock={item.bajo_stock} obsoleto={item.obsoleto} />
                </div>

                <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between">
                  <span>Última salida:</span>
                  <span>{formatFecha(item.ultima_salida)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => abrirModalSalida(item)}
                    aria-label={`Registrar salida de ${item.titulo}`}
                    className="min-h-11 text-center text-xs font-bold rounded-xl bg-red-600 text-white active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                  >
                    Salida
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirModalAjuste(item)}
                    aria-label={`Ajustar existencias de ${item.titulo}`}
                    className="min-h-11 text-center text-xs font-bold rounded-xl bg-[#b07c19] text-white active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252525]"
                  >
                    Ajuste
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerKardex(item)}
                    aria-label={`Ver Kardex de ${item.titulo}`}
                    className="min-h-11 text-center text-xs font-semibold rounded-xl bg-[#f3f3f3] text-[#252525] border border-gray-200 active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19]"
                  >
                    Kardex
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Paginacion
            paginaActual={paginaExistencias}
            totalResultados={totalExistencias}
            tamanoPagina={existenciasLimit}
            opcionesTamano={[20, 50, 100]}
            onCambiarPagina={setPaginaExistencias}
            onCambiarTamano={setTamanoPaginaExistencias}
            cargando={loadingExistencias}
            etiquetaResultados="existencias"
          />
        </>
      )}
    </div>
  );
}

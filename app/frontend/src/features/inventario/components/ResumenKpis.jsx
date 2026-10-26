import { Layers, AlertTriangle, Package, Clock, DollarSign } from 'lucide-react';

export default function ResumenKpis({ resumen, loadingResumen, setActiveTab, setEstadoFilter }) {
  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Unidades */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Total Unidades</span>
            <Layers className="w-4 h-4 text-[#b07c19]" />
          </div>
          <p className="text-2xl font-extrabold text-[#252525] font-mono">
            {loadingResumen ? '...' : resumen.total_unidades.toLocaleString()}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 font-medium">
            {resumen.titulos_con_stock} títulos con stock
          </span>
        </div>

        {/* Bajo Stock */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('existencias');
            setEstadoFilter('bajo_stock');
          }}
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-amber-600 transition-colors">Bajo Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 font-mono">
            {loadingResumen ? '...' : resumen.bajo_stock}
          </p>
          <span className="text-[11px] text-gray-500 group-hover:text-amber-600 transition-colors font-medium">
            Filtrar en existencias →
          </span>
        </button>

        {/* Agotados */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('existencias');
            setEstadoFilter('todos');
          }}
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-red-600 transition-colors">Agotados</span>
            <Package className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-600 font-mono">
            {loadingResumen ? '...' : resumen.agotados}
          </p>
          <span className="text-[11px] text-gray-500 group-hover:text-red-600 transition-colors font-medium">
            Stock en 0 unidades
          </span>
        </button>

        {/* Inventario sin movimientos de salida; el reporte Stock obsoleto usa ventas comerciales. */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('existencias');
            setEstadoFilter('obsoleto');
          }}
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-gray-900 transition-colors">Sin salidas</span>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-extrabold text-[#252525] font-mono">
            {loadingResumen ? '...' : resumen.obsoletos}
          </p>
          <span className="text-[11px] text-gray-500 group-hover:text-[#252525] transition-colors font-medium">
            Sin movimientos de salida en la ventana configurada →
          </span>
        </button>

        {/* Libros sin precio */}
        <div className="col-span-2 sm:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Sin Precio</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-600 font-mono">
            {loadingResumen ? '...' : resumen.libros_sin_precio}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">
            Pendientes de precio
          </span>
        </div>
      </div>

      {/* Lista de Alertas Críticas de Bajo Stock */}
      {resumen.alertas_bajo_stock && resumen.alertas_bajo_stock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Alertas Críticas de Bajo Stock ({resumen.alertas_bajo_stock.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {resumen.alertas_bajo_stock.map((alerta, idx) => (
              <div
                key={`${alerta.titulo}-${alerta.bodega_nombre}-${idx}`}
                className="bg-white border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs shadow-2xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#252525] truncate">{alerta.titulo}</p>
                  <p className="text-[11px] text-gray-500">{alerta.bodega_nombre}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-700">
                    {alerta.stock_actual}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono"> / {alerta.stock_minimo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

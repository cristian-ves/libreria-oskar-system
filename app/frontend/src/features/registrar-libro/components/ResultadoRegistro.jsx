import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ResultadoRegistro({ regResultado, onReiniciar }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-[#b07c19]" />
        <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider">
          Libro Registrado Exitosamente
        </h3>
      </div>
      {regResultado.precio_pendiente && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-3 font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#b07c19]" />
          <span>El libro quedó pendiente de asignación de precio por el Administrador.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-0.5 font-medium">Stock inicial</p>
          <p className="text-lg font-bold text-[#b07c19]">{regResultado.inventario.stock_actual}</p>
        </div>
        <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-0.5 font-medium">Stock mínimo</p>
          <p className="text-lg font-bold text-[#252525]">{regResultado.inventario.stock_minimo}</p>
        </div>
      </div>
      <p className="text-xs font-bold text-[#252525] mb-1 truncate">{regResultado.libro.titulo}</p>
      <p className="text-xs text-gray-500 mb-4 font-mono">ISBN: {regResultado.libro.isbn || '(sin ISBN)'}</p>
      <button
        type="button"
        onClick={onReiniciar}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Registrar otro libro
      </button>
    </div>
  );
}

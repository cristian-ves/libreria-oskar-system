import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function LibroError({ error, onVolver, onReintentar }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#252525] mb-1">Ocurrió un error</h2>
        <p className="text-xs text-gray-500 mb-6">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>
          <button
            type="button"
            onClick={onReintentar}
            className="inline-flex items-center gap-1.5 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

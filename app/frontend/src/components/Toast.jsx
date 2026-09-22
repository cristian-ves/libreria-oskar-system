import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, BookOpen, Layers } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-bounce-in transition-all duration-300">
      <div
        className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3.5 bg-white ${
          isSuccess
            ? 'border-amber-400 text-[#252525]'
            : isError
            ? 'border-red-400 text-[#252525]'
            : 'border-gray-200 text-[#252525]'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isSuccess && <CheckCircle2 className="w-6 h-6 text-[#e19922]" />}
          {isError && <AlertCircle className="w-6 h-6 text-red-600" />}
          {!isSuccess && !isError && <Info className="w-6 h-6 text-[#b07c19]" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#252525] tracking-wide">
              {toast.title || (isSuccess ? '¡Operación Exitosa!' : 'Atención')}
            </h4>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-[#252525] transition-colors p-1 -mr-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {toast.bookTitle && (
            <div className="mt-1.5 p-2 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#b07c19] flex-shrink-0" />
              <p className="text-sm font-bold text-[#252525] truncate">
                {toast.bookTitle}
              </p>
            </div>
          )}

          {toast.message && (
            <p className="mt-1 text-xs text-gray-600 leading-relaxed font-medium">
              {toast.message}
            </p>
          )}

          {toast.stockInfo && (
            <div className="mt-2 flex items-center gap-2 text-xs font-mono font-bold text-[#b07c19]">
              <Layers className="w-3.5 h-3.5 text-[#e19922]" />
              <span>Stock en bodega: {toast.stockInfo.actual} (+1 ingresado)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

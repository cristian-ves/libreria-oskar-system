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
        className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3.5 ${
          isSuccess
            ? 'bg-emerald-950/90 border-emerald-500/50 text-white'
            : isError
            ? 'bg-rose-950/90 border-rose-500/50 text-white'
            : 'bg-slate-900/90 border-slate-700 text-white'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          {isError && <AlertCircle className="w-6 h-6 text-rose-400" />}
          {!isSuccess && !isError && <Info className="w-6 h-6 text-blue-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-wide">
              {toast.title || (isSuccess ? '¡Operación Exitosa!' : 'Atención')}
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {toast.bookTitle && (
            <div className="mt-1.5 p-2 bg-black/30 rounded-lg border border-white/10 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-200 truncate">
                {toast.bookTitle}
              </p>
            </div>
          )}

          {toast.message && (
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {toast.message}
            </p>
          )}

          {toast.stockInfo && (
            <div className="mt-2 flex items-center gap-2 text-xs font-mono text-emerald-300">
              <Layers className="w-3.5 h-3.5" />
              <span>Stock en bodega: {toast.stockInfo.actual} (+1 ingresado)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

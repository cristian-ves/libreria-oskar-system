import React from 'react';
import { Loader2, Globe, Database } from 'lucide-react';

export default function LoadingSpinner({ message = 'Procesando escaneo con Google Books API...' }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-scale-in">
        <div className="relative mb-5">
          {/* Círculo giratorio exterior */}
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          {/* Icono central pulsante */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
        </div>

        <h3 className="text-base font-bold text-white mb-2">
          Consultando Catálogo
        </h3>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 font-mono bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <Database className="w-3.5 h-3.5 animate-bounce" />
          <span>Transacción ACID en curso...</span>
        </div>
      </div>
    </div>
  );
}

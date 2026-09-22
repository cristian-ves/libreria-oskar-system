import React from 'react';
import { Globe, Database } from 'lucide-react';

export default function LoadingSpinner({ message = 'Procesando escaneo con Google Books API...' }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-scale-in">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#e19922] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="w-6 h-6 text-[#b07c19] animate-pulse" />
          </div>
        </div>

        <h3 className="text-base font-bold text-[#252525] mb-2">
          Consultando Catálogo
        </h3>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">
          {message}
        </p>

        <div className="flex items-center gap-2 text-[11px] text-[#252525] font-mono font-bold bg-[#f3f3f3] px-3 py-1.5 rounded-xl border border-gray-200">
          <Database className="w-3.5 h-3.5 text-[#b07c19] animate-bounce" />
          <span>Transacción ACID en curso...</span>
        </div>
      </div>
    </div>
  );
}

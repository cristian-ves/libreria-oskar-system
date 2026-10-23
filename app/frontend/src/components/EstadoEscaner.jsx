import React from 'react';
import { Keyboard, Loader2 } from 'lucide-react';

const TEXTOS = {
  iniciando: 'Iniciando cámara… Si el navegador pide permiso, acéptalo.',
  buscando: 'Buscando código: acércalo hasta llenar el recuadro',
  ayuda: 'No se lee todavía. Acerca o aleja un poco el libro, evita reflejos y busca buena luz.',
};

const RETRASOS_PUNTOS = ['', '[animation-delay:150ms]', '[animation-delay:300ms]'];

// Presentacional: bloque bajo el visor (alto mínimo de dos líneas); muestra el texto de la fase actual; no conoce la cámara.
export default function EstadoEscaner({ fase, onEscribir }) {
  const texto = TEXTOS[fase];
  if (!texto) return null;
  return (
    <div className="mt-1.5 min-h-[2.5rem] flex flex-col items-center gap-1.5">
      <p
        role="status"
        aria-live="polite"
        className="text-[11px] font-mono font-bold text-[#252525] bg-[#e8c85e] px-2.5 py-0.5 rounded-md shadow-xs flex items-center justify-center gap-1.5 text-center max-w-full"
      >
        {fase === 'iniciando' && (
          <Loader2 aria-hidden="true" className="w-3 h-3 shrink-0 animate-spin motion-reduce:animate-none" />
        )}
        <span>{texto}</span>
        {fase === 'buscando' && (
          <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
            {RETRASOS_PUNTOS.map((retraso, i) => (
              <span key={i} className={`w-1 h-1 rounded-full bg-[#252525] animate-bounce motion-reduce:animate-none ${retraso}`} />
            ))}
          </span>
        )}
      </p>
      {fase === 'ayuda' && onEscribir && (
        <button
          type="button"
          onClick={onEscribir}
          className="flex items-center gap-1.5 text-[11px] font-bold bg-white text-[#252525] px-2.5 py-1 rounded-md shadow-xs hover:bg-[#f3f3f3]"
        >
          <Keyboard className="w-3.5 h-3.5" />
          Escribir el ISBN
        </button>
      )}
    </div>
  );
}

import { AlertCircle } from 'lucide-react';

const TEXTO_PISTA = 'No se encontró; es opcional.';

// Pista suave para campos opcionales que llegaron vacíos (no bloquea ni resalta).
export function PistaOpcional({ id }) {
  return <p id={id} className="text-[11px] text-gray-500 mt-1">{TEXTO_PISTA}</p>;
}

/**
 * campos: obligatorios pendientes ({ etiqueta }).
 * variante "aviso": recuadro ámbar arriba del formulario (región live siempre montada).
 * variante "linea": texto bajo el botón.
 */
export default function AvisoCamposFaltantes({ campos, variante = 'aviso' }) {
  const texto = `Falta completar: ${campos.map(c => c.etiqueta).join(', ')}`;
  const hay = campos.length > 0;

  if (variante === 'linea') {
    return hay ? <p className="text-xs text-amber-800 text-center">{texto}</p> : null;
  }
  return (
    <div role="status" aria-live="polite">
      {hay && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#b07c19]" />
          <span>{texto}</span>
        </div>
      )}
    </div>
  );
}

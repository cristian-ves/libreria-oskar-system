import { Minus, Plus } from 'lucide-react';

const BTN =
  'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-200 bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#f3f3f3] disabled:hover:text-[#252525] transition-all cursor-pointer';

export default function ControlCantidad({ cantidad, max, onChange, disabled, titulo }) {
  // El estado guarda texto; los botones operan con enteros y respetan [1, max].
  const n = /^\d+$/.test(cantidad) ? Number(cantidad) : null;
  // Sin max no hay tope: Infinity deja a Math.min igual a n ± 1 (con undefined daría NaN).
  const tope = max ?? Infinity;
  const de = titulo ? ` de ${titulo}` : '';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(String(Math.min(tope, n - 1)))}
        disabled={disabled || n === null || n <= 1}
        aria-label={`Disminuir cantidad${de}`}
        className={BTN}
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        value={cantidad}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`Cantidad${de}`}
        className="w-16 min-h-[44px] text-center bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-2 outline-none focus:border-[#b07c19] font-mono font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(n === null ? '1' : String(Math.min(tope, n + 1)))}
        disabled={disabled || (n !== null && n >= tope)}
        aria-label={`Aumentar cantidad${de}`}
        className={BTN}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

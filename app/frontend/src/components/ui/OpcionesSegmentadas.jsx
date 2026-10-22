export default function OpcionesSegmentadas({ opciones, valor, onChange, ariaLabel, disabled }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op.valor}
          type="button"
          role="radio"
          aria-checked={valor === op.valor}
          disabled={disabled}
          onClick={() => onChange(op.valor)}
          className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            valor === op.valor
              ? 'bg-[#e19922] text-[#252525] shadow-xs'
              : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}

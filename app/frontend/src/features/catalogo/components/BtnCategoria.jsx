export default function BtnCategoria({ id, label, activo, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full text-left text-xs px-3 rounded-xl transition-all duration-150 min-h-[38px] flex items-center ${
        activo
          ? 'bg-[#e19922] text-[#252525] font-bold shadow-xs'
          : 'text-[#252525] hover:bg-[#b07c19] hover:text-white hover:-translate-y-0.5'
      }`}
    >
      {label}
    </button>
  );
}

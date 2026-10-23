import { Loader2 } from 'lucide-react';

export default function BotonPrincipal({ cargando = false, textoCargando, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={`w-full py-2.5 px-4 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white font-bold text-sm rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#e19922] disabled:hover:text-[#252525] flex items-center justify-center gap-2 cursor-pointer ${className}`}
    >
      {cargando ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{textoCargando}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

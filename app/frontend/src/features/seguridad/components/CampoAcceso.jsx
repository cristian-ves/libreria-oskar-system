import { forwardRef } from 'react';

const CLASE_INPUT =
  'w-full pl-10 pr-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-sm text-[#252525] placeholder-gray-400 focus:outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-colors';

// Campo con etiqueta e ícono, con el estilo del login. Reenvía la ref al input.
const CampoAcceso = forwardRef(function CampoAcceso({ id, label, icono: Icono, ...props }, ref) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[#252525] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Icono className="w-4 h-4" />
        </div>
        <input id={id} ref={ref} required className={CLASE_INPUT} {...props} />
      </div>
    </div>
  );
});

export default CampoAcceso;

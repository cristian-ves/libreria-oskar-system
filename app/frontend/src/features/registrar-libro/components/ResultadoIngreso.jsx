import { CheckCircle, RefreshCw } from 'lucide-react';

export default function ResultadoIngreso({ ingresoResultado, bodegas, onReiniciar }) {
  const bodegaNombrePorId = (id) => {
    const b = bodegas.find(x => x.id === id);
    return b ? `${b.nombre}${b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}` : id;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-[#b07c19]" />
        <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider">
          Ingreso Registrado
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-0.5 font-medium">Unidades ingresadas</p>
          <p className="text-lg font-bold text-[#b07c19]">+{ingresoResultado.movimiento.cantidad}</p>
        </div>
        <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-0.5 font-medium">Stock actual</p>
          <p className="text-lg font-bold text-[#252525]">{ingresoResultado.inventario.stock_actual}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Bodega: <span className="text-[#252525] font-bold">{bodegaNombrePorId(ingresoResultado.inventario.bodega_id)}</span>
      </p>
      <button
        type="button"
        onClick={onReiniciar}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Registrar otro libro
      </button>
    </div>
  );
}

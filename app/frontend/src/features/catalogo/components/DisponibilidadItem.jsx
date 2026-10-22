import { Warehouse, MapPin, Phone } from 'lucide-react';

export default function DisponibilidadItem({ item }) {
  const stock = Number(item.stock_actual) || 0;
  const tieneStock = stock > 0;

  return (
    <div className="bg-[#f3f3f3] border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#252525] text-sm">{item.sucursal_nombre}</span>
          <span className="text-gray-500 text-xs flex items-center gap-1 font-medium">
            <Warehouse className="w-3 h-3 text-[#b07c19]" />
            {item.bodega_nombre}
          </span>
        </div>
        {item.sucursal_direccion && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{item.sucursal_direccion}</span>
          </p>
        )}
        {item.sucursal_telefono && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{item.sucursal_telefono}</span>
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center">
        {tieneStock ? (
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-[#e19922] text-[#252525] shadow-xs">
            {stock} {stock === 1 ? 'unidad' : 'unidades'}
          </span>
        ) : (
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-red-100 border border-red-200 text-red-700">
            Agotado
          </span>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Tag, Warehouse } from 'lucide-react';
import ModalPrecioLibro from '../../../components/ModalPrecioLibro';
import { formatPrecio } from '../../../utils/formatters';

export default function FichaLibroExistente({ libroExistente, inventarios, esAdmin, onPrecioActualizado }) {
  const [precioAbierto, setPrecioAbierto] = useState(false);
  const tienePrecio = Number(libroExistente.precio) > 0;
  return (
    <>
      {/* Tarjeta del libro */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex gap-4">
          {libroExistente.imagen_url && (
            <div className="shrink-0">
              <img
                src={libroExistente.imagen_url}
                alt={libroExistente.titulo}
                className="w-20 h-28 object-cover rounded-xl border border-gray-200 shadow-xs"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#e8c85e] text-[#252525] font-bold">
                En catálogo
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#252525] leading-snug mb-1 line-clamp-2">
              {libroExistente.titulo}
            </h2>
            {libroExistente.autor_nombre && (
              <p className="text-sm text-gray-600 mb-0.5 font-medium">{libroExistente.autor_nombre}</p>
            )}
            {libroExistente.editorial_nombre && (
              <p className="text-xs text-gray-400">{libroExistente.editorial_nombre}</p>
            )}
            {esAdmin && (
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <p className="text-xs text-[#b07c19] font-mono font-bold">
                  Precio: {formatPrecio(libroExistente.precio)}
                </p>
                <button
                  type="button"
                  onClick={() => setPrecioAbierto(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white transition-all cursor-pointer"
                >
                  <Tag className="w-3 h-3" />
                  {tienePrecio ? 'Cambiar precio' : 'Fijar precio'}
                </button>
              </div>
            )}
            {libroExistente.isbn && (
              <p className="text-[10px] text-gray-400 font-mono mt-1 font-medium">ISBN: {libroExistente.isbn}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stock por bodega */}
      {inventarios.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#e19922]" />
            Stock actual por bodega
          </h3>
          <div className="space-y-2">
            {inventarios.map(inv => (
              <div
                key={inv.bodega_id}
                className="flex items-center justify-between px-3.5 py-2.5 bg-[#f3f3f3] rounded-xl border border-gray-200 text-xs"
              >
                <div>
                  <span className="font-bold text-[#252525]">{inv.bodega_nombre}</span>
                  {inv.sucursal_nombre && (
                    <span className="text-gray-500 ml-1.5">· {inv.sucursal_nombre}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-mono font-extrabold ${inv.stock_actual <= inv.stock_minimo ? 'text-amber-600' : 'text-[#252525]'}`}>
                    {inv.stock_actual} uds.
                  </span>
                  <span className="text-gray-400 ml-1">(mín. {inv.stock_minimo})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {esAdmin && precioAbierto && (
        <ModalPrecioLibro
          libro={libroExistente}
          onClose={() => setPrecioAbierto(false)}
          onSuccess={(libroActualizado) => {
            setPrecioAbierto(false);
            onPrecioActualizado(libroActualizado);
          }}
        />
      )}
    </>
  );
}

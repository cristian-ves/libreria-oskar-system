import { Trash2, ShoppingBag } from 'lucide-react';
import { formatQuetzales } from '../../../utils/dinero';
import ControlCantidad from './ControlCantidad';

export default function LineasVenta({ lineas, onCantidad, onQuitar }) {
  if (lineas.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Busca y agrega libros para armar la venta.</p>
      </div>
    );
  }

  return (
    <ul className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
      {lineas.map((l) => {
        const n = Number(l.cantidad);
        const valida = /^\d+$/.test(l.cantidad) && n >= 1 && n <= l.stock;
        return (
          <li key={l.libroId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#252525] text-sm truncate">{l.titulo}</p>
              <p className="text-[11px] font-mono text-gray-500">
                {formatQuetzales(l.precio)} c/u · Stock: {l.stock}
              </p>
              {!valida && (
                <p className="text-[11px] text-red-600 font-semibold">Cantidad entera entre 1 y {l.stock}.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ControlCantidad
                cantidad={l.cantidad}
                max={l.stock}
                onChange={(cantidad) => onCantidad(l.libroId, cantidad)}
                titulo={l.titulo}
              />
              <span className="w-24 text-right font-mono font-extrabold text-sm text-[#252525]">
                {formatQuetzales(valida ? l.precio * n : 0)}
              </span>
              <button
                type="button"
                onClick={() => onQuitar(l.libroId)}
                aria-label={`Quitar ${l.titulo}`}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

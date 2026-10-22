import { formatFechaVenta } from '../../../utils/formatters';
import { formatMonto } from '../../../utils/dinero';
import EstadoVentaBadge from './EstadoVentaBadge';

function Dato({ etiqueta, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-gray-500 uppercase font-semibold">{etiqueta}</p>
      <p className="text-sm text-[#252525] font-medium break-words">{children}</p>
    </div>
  );
}

export default function FichaVenta({ venta }) {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold font-mono text-[#252525]">{venta.codigo}</h2>
          <EstadoVentaBadge estado={venta.estado} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Dato etiqueta="Fecha">{formatFechaVenta(venta.fecha)}</Dato>
          <Dato etiqueta="Bodega">{venta.bodega?.nombre}</Dato>
          <Dato etiqueta="Vendedor">{venta.vendedor?.nombre_completo}</Dato>
          <Dato etiqueta="Cliente">{venta.cliente_nombre}</Dato>
          <Dato etiqueta="NIT">{venta.cliente_nit || '—'}</Dato>
          <Dato etiqueta="Método de pago">{venta.metodo_pago}</Dato>
        </div>
        {venta.notas && <Dato etiqueta="Notas">{venta.notas}</Dato>}
      </div>

      {venta.estado === 'Anulada' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Dato etiqueta="Anulada el">{formatFechaVenta(venta.anulada_en)}</Dato>
          <Dato etiqueta="Anulada por">{venta.anulada_por?.nombre_completo || '—'}</Dato>
          <Dato etiqueta="Motivo">{venta.motivo_anulacion}</Dato>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Libro</th>
              <th className="py-3 px-4">ISBN</th>
              <th className="py-3 px-4 text-center">Cant.</th>
              <th className="py-3 px-4 text-right">Precio</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {venta.detalles.map((d) => (
              <tr key={d.libro_id}>
                <td className="py-3 px-4 font-bold text-[#252525]">{d.titulo}</td>
                <td className="py-3 px-4 font-mono text-[11px] text-gray-500">{d.isbn || '—'}</td>
                <td className="py-3 px-4 text-center font-mono">{d.cantidad}</td>
                <td className="py-3 px-4 text-right font-mono">{formatMonto(d.precio_unitario)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold">{formatMonto(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-100 space-y-1 text-sm ml-auto sm:max-w-xs">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-mono">{formatMonto(venta.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Descuento</span><span className="font-mono">{formatMonto(venta.descuento)}</span></div>
          <div className="flex justify-between pt-1 border-t border-gray-100"><span className="font-bold text-[#252525]">Total</span><span className="font-mono font-extrabold text-[#252525]">{formatMonto(venta.total)}</span></div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFechaVenta } from '../../../utils/formatters';
import { formatMonto } from '../../../utils/dinero';
import { VENTAS_LIMIT } from '../hooks/useVentas';
import EstadoVentaBadge from './EstadoVentaBadge';
import ErrorBox from '../../../components/ui/ErrorBox';

const BTN_PAG =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:text-[#252525] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold';

export default function TablaVentas({ ventas, total, loading, error, offset, setOffset, onReintentar, rangoInvalido }) {
  if (rangoInvalido) return null;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-medium">Cargando ventas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorBox error={error} />
        <button
          type="button"
          onClick={onReintentar}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white transition-all cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (ventas.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#252525] mb-1">No hay ventas</h3>
        <p className="text-xs text-gray-500">No se encontraron ventas con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4">Código</th>
              <th className="py-3.5 px-4">Fecha</th>
              <th className="py-3.5 px-4">Cliente</th>
              <th className="py-3.5 px-4">Método</th>
              <th className="py-3.5 px-4 text-center">Líneas / Uds.</th>
              <th className="py-3.5 px-4 text-right">Total</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 px-4">Vendedor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {ventas.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-3 px-4 font-mono font-bold">
                  <Link to={`/ventas/${v.id}`} className="text-[#b07c19] hover:underline">{v.codigo}</Link>
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">{formatFechaVenta(v.fecha)}</td>
                <td className="py-3 px-4 font-medium">{v.cliente_nombre}</td>
                <td className="py-3 px-4">{v.metodo_pago}</td>
                <td className="py-3 px-4 text-center font-mono">{v.lineas} / {v.unidades}</td>
                <td className="py-3 px-4 text-right font-mono font-extrabold text-[#252525]">{formatMonto(v.total)}</td>
                <td className="py-3 px-4"><EstadoVentaBadge estado={v.estado} /></td>
                <td className="py-3 px-4 text-gray-600">{v.vendedor_nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {ventas.map((v) => (
          <Link
            key={v.id}
            to={`/ventas/${v.id}`}
            className="block bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-[#252525]">{v.codigo}</span>
              <EstadoVentaBadge estado={v.estado} />
            </div>
            <p className="text-xs text-gray-600">{v.cliente_nombre} · {v.metodo_pago}</p>
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
              <span>{formatFechaVenta(v.fecha)}</span>
              <span>{v.lineas} líneas / {v.unidades} uds.</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-[11px] text-gray-500">{v.vendedor_nombre}</span>
              <span className="font-mono font-extrabold text-[#252525]">{formatMonto(v.total)}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-gray-500 font-medium">
          Mostrando <strong className="text-[#252525]">{offset + 1}</strong>–
          <strong className="text-[#252525]">{Math.min(offset + VENTAS_LIMIT, total)}</strong> de{' '}
          <strong className="text-[#252525]">{total}</strong> ventas
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOffset((p) => Math.max(0, p - VENTAS_LIMIT))} disabled={offset === 0} className={BTN_PAG}>
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>
          <button type="button" onClick={() => setOffset((p) => p + VENTAS_LIMIT)} disabled={offset + VENTAS_LIMIT >= total} className={BTN_PAG}>
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

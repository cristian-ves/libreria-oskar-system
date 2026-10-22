import { Link } from 'react-router-dom';
import { Receipt, Plus } from 'lucide-react';
import useVentas from '../features/ventas/hooks/useVentas';
import FiltrosVentas from '../features/ventas/components/FiltrosVentas';
import TablaVentas from '../features/ventas/components/TablaVentas';

export default function Ventas() {
  const {
    ventas, total, loading, error, rangoInvalido, cargar,
    estado, setEstado, desde, setDesde, hasta, setHasta, offset, setOffset,
  } = useVentas();

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4 text-[#e19922]" />
            <span>Mostrador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">Ventas</h1>
        </div>
        <Link
          to="/ventas/nueva"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva venta</span>
        </Link>
      </div>

      <div className="space-y-5">
        <FiltrosVentas
          estado={estado}
          setEstado={setEstado}
          desde={desde}
          setDesde={setDesde}
          hasta={hasta}
          setHasta={setHasta}
          rangoInvalido={rangoInvalido}
        />
        <TablaVentas
          ventas={ventas}
          total={total}
          loading={loading}
          error={error}
          offset={offset}
          setOffset={setOffset}
          onReintentar={cargar}
          rangoInvalido={rangoInvalido}
        />
      </div>
    </div>
  );
}

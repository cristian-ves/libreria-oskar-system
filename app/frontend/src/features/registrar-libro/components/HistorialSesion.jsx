import { Clock } from 'lucide-react';

export default function HistorialSesion({ historial }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#b07c19]" />
        Historial ({historial.length})
      </h3>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {historial.map((item, idx) => (
          <div
            key={`${item.libro?.id || idx}-${idx}`}
            className="p-2.5 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs"
          >
            <div className="min-w-0">
              <p className="font-bold text-[#252525] truncate">{item.libro?.titulo}</p>
              <p className="text-[10px] text-gray-500 font-mono truncate">
                {item.tipo === 'registro' ? 'Registro nuevo' : 'Ingreso'} ·{' '}
                {item.movimiento?.fecha_movimiento
                  ? new Date(item.movimiento.fecha_movimiento).toLocaleTimeString()
                  : ''}
              </p>
            </div>
            <span className="font-mono text-[#b07c19] font-bold shrink-0">
              +{item.movimiento?.cantidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

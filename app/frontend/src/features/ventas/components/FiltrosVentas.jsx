import Input from '../../../components/ui/Input';
import FieldLabel from '../../../components/ui/FieldLabel';

const CHIPS = [
  { id: '', label: 'Todas' },
  { id: 'Completada', label: 'Completada' },
  { id: 'Anulada', label: 'Anulada' },
];

export default function FiltrosVentas({ estado, setEstado, desde, setDesde, hasta, setHasta, rangoInvalido }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setEstado(chip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                estado === chip.id
                  ? 'bg-[#e19922] text-[#252525] shadow-xs'
                  : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-96">
          <div>
            <FieldLabel>Desde</FieldLabel>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Hasta</FieldLabel>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>
      {rangoInvalido && (
        <p className="text-[11px] text-red-600 font-semibold">La fecha «Desde» no puede ser posterior a «Hasta».</p>
      )}
    </div>
  );
}

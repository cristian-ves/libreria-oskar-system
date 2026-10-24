import { BarChart3 } from 'lucide-react';
import Select from '../../../components/ui/Select';
import { REPORTES } from '../reportes.config';

export default function SelectorReporte({ value, onChange }) {
  return <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
    <label htmlFor="selector-reporte" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a5b08] mb-2"><BarChart3 aria-hidden="true" className="w-4 h-4" />Reporte administrativo</label>
    <Select id="selector-reporte" value={value} onChange={(event) => onChange(event.target.value)}>
      {REPORTES.map((reporte) => <option key={reporte.id} value={reporte.id}>{reporte.titulo}</option>)}
    </Select>
  </div>;
}

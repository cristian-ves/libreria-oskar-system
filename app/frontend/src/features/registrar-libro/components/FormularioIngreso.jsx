import { PackagePlus } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

export default function FormularioIngreso({ errorBox, ingresoForm, setIngresoForm, bodegas, loadingMaestros, isLoading, onSubmit }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-4 flex items-center gap-2">
        <PackagePlus className="w-4 h-4 text-[#e19922]" />
        Ingresar Unidades
      </h3>
      <ErrorBox error={errorBox} />
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <FieldLabel required>Bodega de destino</FieldLabel>
          {loadingMaestros ? (
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
          ) : (
            <Select
              value={ingresoForm.bodegaId}
              onChange={e => setIngresoForm(f => ({ ...f, bodegaId: e.target.value }))}
              disabled={isLoading}
            >
              <option value="">— Selecciona bodega —</option>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre}{b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <FieldLabel required>Cantidad</FieldLabel>
          <Input
            type="number"
            min={1}
            step={1}
            value={ingresoForm.cantidad}
            onChange={e => setIngresoForm(f => ({ ...f, cantidad: e.target.value }))}
            disabled={isLoading}
            placeholder="1"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white disabled:opacity-50 text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <PackagePlus className="w-4 h-4" />
          {isLoading ? 'Registrando...' : 'Confirmar Ingreso'}
        </button>
      </form>
    </div>
  );
}

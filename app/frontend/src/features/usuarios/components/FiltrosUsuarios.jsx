import { Search, SlidersHorizontal } from 'lucide-react';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { ROLES } from '../../../utils/roles';

export default function FiltrosUsuarios({ busqueda, setBusqueda, rol, setRol, estado, setEstado }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm" aria-label="Filtros de usuarios">
      <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-3">
        <SlidersHorizontal aria-hidden="true" className="w-4 h-4" />
        <span>Buscar y filtrar</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem] gap-3">
        <div>
          <FieldLabel>Nombre o correo</FieldLabel>
          <div className="relative">
            <Search aria-hidden="true" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="search"
              aria-label="Buscar por nombre o correo"
              placeholder="Buscar usuarios..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Rol</FieldLabel>
          <Select aria-label="Filtrar por rol" value={rol} onChange={(event) => setRol(event.target.value)}>
            <option value="">Todos los roles</option>
            <option value={ROLES.ADMINISTRADOR}>{ROLES.ADMINISTRADOR}</option>
            <option value={ROLES.EMPLEADO}>{ROLES.EMPLEADO}</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Estado</FieldLabel>
          <Select aria-label="Filtrar por estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </Select>
        </div>
      </div>
    </section>
  );
}

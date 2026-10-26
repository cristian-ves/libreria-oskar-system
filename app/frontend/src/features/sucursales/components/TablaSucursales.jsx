import { Building2, Eye, Pencil, Power } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';

function Acciones({ sucursal, onDetalle, onEditar, onEstado }) {
  return <div className="flex flex-wrap gap-2">
    <button type="button" onClick={() => onDetalle(sucursal)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold hover:bg-gray-50"><Eye aria-hidden="true" className="h-4 w-4" />Bodegas</button>
    <button type="button" onClick={() => onEditar(sucursal)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold hover:bg-gray-50"><Pencil aria-hidden="true" className="h-4 w-4" />Editar</button>
    <button type="button" onClick={() => onEstado(sucursal)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${sucursal.activo ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}><Power aria-hidden="true" className="h-4 w-4" />{sucursal.activo ? 'Desactivar' : 'Reactivar'}</button>
  </div>;
}

export default function TablaSucursales({ rows, cargando, error, onDetalle, onEditar, onEstado, onReintentar }) {
  if (cargando) return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center" role="status" aria-live="polite"><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#e19922]" /><p className="text-sm text-gray-500">Cargando sucursales…</p></div>;
  if (error) return <div className="space-y-3"><ErrorBox error={error} /><button type="button" onClick={onReintentar} className="min-h-11 rounded-xl bg-[#e19922] px-4 text-sm font-bold">Reintentar</button></div>;
  if (!rows.length) return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center sm:p-12"><Building2 aria-hidden="true" className="mx-auto mb-3 h-11 w-11 text-gray-300" /><h2 className="font-bold text-[#252525]">No hay sucursales</h2><p className="mt-1 text-sm text-gray-500">Ajusta los filtros o crea una sucursal.</p></div>;
  return <>
    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block"><table className="w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-600"><tr><th scope="col" className="px-4 py-3">Sucursal</th><th scope="col" className="px-4 py-3">Bodegas</th><th scope="col" className="px-4 py-3">Estado</th><th scope="col" className="px-4 py-3">Acciones</th></tr></thead>
      <tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-4 py-3"><p className="font-bold text-[#252525]">{row.nombre}</p><p className="text-xs text-gray-500">{row.direccion}{row.telefono ? ` · ${row.telefono}` : ''}</p></td><td className="px-4 py-3">{row.bodegas?.length || 0}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{row.activo ? 'Activa' : 'Inactiva'}</span></td><td className="px-4 py-3"><Acciones sucursal={row} onDetalle={onDetalle} onEditar={onEditar} onEstado={onEstado} /></td></tr>)}</tbody>
    </table></div>
    <div className="space-y-3 lg:hidden">{rows.map((row) => <article key={row.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#252525]">{row.nombre}</h2><p className="mt-1 text-sm text-gray-500">{row.direccion}</p>{row.telefono && <p className="text-xs text-gray-500">{row.telefono}</p>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{row.activo ? 'Activa' : 'Inactiva'}</span></div>
      <div className="border-t border-gray-100 pt-3"><Acciones sucursal={row} onDetalle={onDetalle} onEditar={onEditar} onEstado={onEstado} /></div>
    </article>)}</div>
  </>;
}

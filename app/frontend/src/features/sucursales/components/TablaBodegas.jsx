import { Pencil, Power, Warehouse } from 'lucide-react';

export default function TablaBodegas({ bodegas, onEditar, onEstado }) {
  if (!bodegas.length) return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center"><Warehouse aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-gray-300" /><p className="text-sm font-semibold text-gray-700">Esta sucursal aún no tiene bodegas.</p></div>;
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{bodegas.map((bodega) => <article key={bodega.id} className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-[#252525]">{bodega.nombre}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">{bodega.descripcion || 'Sin descripción'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${bodega.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{bodega.activo ? 'Activa' : 'Inactiva'}</span></div>
    <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
      <button type="button" onClick={() => onEditar(bodega)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold"><Pencil aria-hidden="true" className="h-4 w-4" />Editar</button>
      <button type="button" onClick={() => onEstado(bodega)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${bodega.activo ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><Power aria-hidden="true" className="h-4 w-4" />{bodega.activo ? 'Desactivar' : 'Reactivar'}</button>
    </div>
  </article>)}</div>;
}

import { Database } from 'lucide-react';

const quetzales = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 });
function get(row, path) { return path.split('.').reduce((value, key) => value == null ? null : value[key], row); }
function presentar(value, type) {
  if (value === null || value === undefined || value === '') return 'No disponible';
  if (type === 'money') return Number.isFinite(Number(value)) ? quetzales.format(Number(value)) : 'No disponible';
  if (type === 'number') return Number(value).toLocaleString('es-GT');
  if (type === 'boolean') return value ? 'Sí' : 'No';
  if (type === 'active') return value ? 'Activo' : 'Inactivo';
  if (type === 'date') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-GT', { timeZone: 'America/Guatemala', dateStyle: 'short', timeStyle: 'short' });
  }
  return String(value);
}

function TablaSeccion({ seccion }) {
  return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <h2 className="border-b border-gray-200 bg-[#f3f3f3] px-4 py-3 text-sm font-bold text-[#252525]">{seccion.titulo}</h2>
    {!seccion.filas.length ? <p className="p-6 text-center text-sm text-gray-500">No hay registros para esta sección.</p> : <>
      <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs">
        <thead className="bg-white text-gray-600"><tr>{seccion.columnas.map(([label], i) => <th key={i} scope="col" className="whitespace-nowrap px-3 py-3 font-bold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">{seccion.filas.map((row, index) => <tr key={row.id || row.libro_id || row.inventario_id || row.venta_id || index} className="align-top hover:bg-gray-50">{seccion.columnas.map(([label, key, type], colIndex) => <td key={`${label}-${colIndex}`} data-label={label} className="max-w-[24rem] break-words px-3 py-3">{presentar(get(row, key), type)}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="space-y-3 p-3 md:hidden">{seccion.filas.map((row, index) => <article key={row.id || row.libro_id || row.inventario_id || row.venta_id || index} className="rounded-xl border border-gray-100 p-3"><dl className="grid grid-cols-1 gap-2">{seccion.columnas.map(([label, key, type]) => <div key={key} className="flex items-start justify-between gap-3 text-xs"><dt className="shrink-0 font-semibold text-gray-500">{label}</dt><dd className="min-w-0 text-right font-medium text-[#252525] break-words">{presentar(get(row, key), type)}</dd></div>)}</dl></article>)}</div>
    </>}
  </section>;
}

export default function TablaReporte({ secciones = [], cargando }) {
  if (cargando) return <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm" role="status" aria-live="polite"><span className="mx-auto mb-3 block h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#e19922]" /><span className="text-sm text-gray-600">Cargando reporte…</span></div>;
  if (!secciones.length || secciones.every((seccion) => !seccion.filas.length)) return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"><Database aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-gray-300" /><h2 className="text-base font-bold text-[#252525]">Sin resultados</h2><p className="mt-1 text-sm text-gray-500">No se encontraron datos con los filtros aplicados.</p></div>;
  return <div className="space-y-4">{secciones.map((seccion) => <TablaSeccion key={seccion.titulo} seccion={seccion} />)}</div>;
}

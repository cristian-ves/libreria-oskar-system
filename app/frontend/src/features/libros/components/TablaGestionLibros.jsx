import { BookOpen, CircleSlash, Pencil, RotateCcw } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';
import { formatPrecio } from '../../../utils/formatters';

function Estado({ activo }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}><span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-600' : 'bg-gray-500'}`} />{activo ? 'Activo' : 'Inactivo'}</span>;
}

function Acciones({ libro, guardando, onEditar, onCambiarEstado }) {
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={guardando} onClick={() => onEditar(libro)} aria-label={`Editar ${libro.titulo}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-[#252525] hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b07c19] disabled:opacity-50"><Pencil aria-hidden="true" className="w-3.5 h-3.5" /><span>Editar</span></button>
    <button type="button" disabled={guardando} onClick={() => onCambiarEstado(libro)} aria-label={`${libro.activo ? 'Desactivar' : 'Reactivar'} ${libro.titulo}`} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 disabled:opacity-50 ${libro.activo ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-red-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-emerald-500'}`}>{libro.activo ? <CircleSlash aria-hidden="true" className="w-3.5 h-3.5" /> : <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />}<span>{libro.activo ? 'Desactivar' : 'Reactivar'}</span></button>
  </div>;
}

function Detalles({ libro }) {
  const autor = libro.autor_nombre || libro.autor?.nombre || libro.autor || '—';
  const editorial = libro.editorial_nombre || libro.editorial?.nombre || libro.editorial || '—';
  const categoria = libro.categoria_nombre || libro.categoria?.nombre || libro.categoria || '—';
  return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
    <div><dt className="font-semibold text-gray-500">Autor</dt><dd className="text-gray-800 break-words">{autor}</dd></div>
    <div><dt className="font-semibold text-gray-500">Editorial</dt><dd className="text-gray-800 break-words">{editorial}</dd></div>
    <div><dt className="font-semibold text-gray-500">Categoría</dt><dd className="text-gray-800 break-words">{categoria}</dd></div>
    <div><dt className="font-semibold text-gray-500">ISBN</dt><dd className="text-gray-800 break-all">{libro.isbn || '—'}</dd></div>
    {libro.precio !== undefined && <div><dt className="font-semibold text-gray-500">Precio</dt><dd className="text-gray-800">{formatPrecio(libro.precio)}</dd></div>}
  </dl>;
}

export default function TablaGestionLibros({ libros, total, cargando, error, guardando, onEditar, onCambiarEstado, onReintentar }) {
  if (cargando && !libros.length) return <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm" role="status" aria-live="polite"><div className="w-9 h-9 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-gray-500">Cargando libros...</p></div>;
  if (error) return <div className="space-y-3"><ErrorBox error={error} /><button type="button" onClick={onReintentar} className="min-h-11 px-4 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white">Reintentar</button></div>;
  if (!libros.length) return <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm"><BookOpen aria-hidden="true" className="w-11 h-11 text-gray-300 mx-auto mb-3" /><h2 className="text-base font-bold text-[#252525] mb-1">{total ? 'No hay coincidencias en esta página' : 'No hay libros'}</h2><p className="text-sm text-gray-500">{total ? 'Prueba con otros filtros.' : 'Los libros registrados aparecerán aquí.'}</p></div>;

  return <div className={cargando ? 'opacity-70 transition-opacity' : ''} aria-busy={cargando}>
    <div className="hidden xl:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[22%]" /><col className="w-[15%]" /><col className="w-[13%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[15%]" /></colgroup><thead className="bg-[#f3f3f3] text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200"><tr>{['Título', 'Autor', 'Editorial', 'Categoría', 'ISBN', 'Estado', 'Acciones'].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-gray-700">{libros.map((libro) => <tr key={libro.id} className="hover:bg-gray-50/80"><td className="px-3 py-3 font-semibold text-[#252525] break-words">{libro.titulo}</td><td className="px-3 py-3 text-xs break-words">{libro.autor_nombre || libro.autor?.nombre || '—'}</td><td className="px-3 py-3 text-xs break-words">{libro.editorial_nombre || libro.editorial?.nombre || '—'}</td><td className="px-3 py-3 text-xs break-words">{libro.categoria_nombre || libro.categoria?.nombre || '—'}</td><td className="px-3 py-3 text-xs break-all">{libro.isbn || '—'}</td><td className="px-3 py-3"><Estado activo={libro.activo} />{libro.precio !== undefined && <p className="mt-1 text-[11px] text-gray-500">{formatPrecio(libro.precio)}</p>}</td><td className="px-3 py-3"><Acciones libro={libro} guardando={guardando} onEditar={onEditar} onCambiarEstado={onCambiarEstado} /></td></tr>)}</tbody></table></div>
    <div className="xl:hidden space-y-3">{libros.map((libro) => <article key={libro.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"><div className="flex items-start justify-between gap-3"><h2 className="font-bold text-[#252525] break-words min-w-0">{libro.titulo}</h2><Estado activo={libro.activo} /></div><Detalles libro={libro} /><div className="border-t border-gray-100 pt-3"><Acciones libro={libro} guardando={guardando} onEditar={onEditar} onCambiarEstado={onCambiarEstado} /></div></article>)}</div>
  </div>;
}

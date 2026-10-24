import { FolderOpen, Pencil, Trash2 } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';

function Acciones({ categoria, onEditar, onEliminar }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onEditar(categoria)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-[#252525] hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b07c19]">
        <Pencil aria-hidden="true" className="w-3.5 h-3.5" /><span>Editar</span>
      </button>
      <button type="button" onClick={() => onEliminar(categoria)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">
        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" /><span>Eliminar</span>
      </button>
    </div>
  );
}

function CantidadLibros({ cantidad }) {
  const valor = Number(cantidad || 0);
  return <span className="font-semibold text-[#252525]">{valor} {valor === 1 ? 'libro' : 'libros'}</span>;
}

export default function TablaCategorias({ categorias, totalCategorias, cargando, error, onEditar, onEliminar, onReintentar }) {
  if (cargando) {
    return <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm" role="status" aria-live="polite">
      <div className="w-9 h-9 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500 font-medium">Cargando categorías...</p>
    </div>;
  }

  if (error) {
    return <div className="space-y-3">
      <ErrorBox error={error} />
    <button type="button" onClick={onReintentar} className="min-h-11 px-4 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white">Reintentar</button>
    </div>;
  }

  if (!categorias.length) {
    return <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
      <FolderOpen aria-hidden="true" className="w-11 h-11 text-gray-300 mx-auto mb-3" />
      <h2 className="text-base font-bold text-[#252525] mb-1">{totalCategorias ? 'No hay coincidencias' : 'No hay categorías'}</h2>
      <p className="text-sm text-gray-500">{totalCategorias ? 'Prueba con otro nombre.' : 'Cuando crees categorías, aparecerán aquí.'}</p>
    </div>;
  }

  return <>
    <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup><col className="w-[52%]" /><col className="w-[20%]" /><col className="w-[28%]" /></colgroup>
        <thead className="bg-[#f3f3f3] text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
          <tr><th scope="col" className="px-4 py-3.5">Categoría</th><th scope="col" className="px-4 py-3.5">Libros asociados</th><th scope="col" className="px-4 py-3.5">Acciones</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {categorias.map((categoria) => <tr key={categoria.id} className="hover:bg-gray-50/80 transition-colors">
            <td className="px-4 py-3.5 font-semibold text-[#252525] break-words">{categoria.nombre}</td>
            <td className="px-4 py-3.5"><CantidadLibros cantidad={categoria.libros_count} /></td>
            <td className="px-4 py-3.5"><Acciones categoria={categoria} onEditar={onEditar} onEliminar={onEliminar} /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="lg:hidden space-y-3">
      {categorias.map((categoria) => <article key={categoria.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-[#252525] break-words">{categoria.nombre}</h2>
          <CantidadLibros cantidad={categoria.libros_count} />
        </div>
        <div className="border-t border-gray-100 pt-3"><Acciones categoria={categoria} onEditar={onEditar} onEliminar={onEliminar} /></div>
      </article>)}
    </div>
  </>;
}

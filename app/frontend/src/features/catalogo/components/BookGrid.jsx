import { Link } from 'react-router-dom';
import { BookOpen, User, Tag, Layers } from 'lucide-react';
import { formatPrecio } from '../../../utils/formatters';

export default function BookGrid({ libros }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
      {libros.map((libro) => (
        <Link
          key={libro.id}
          to={`/catalogo/${libro.ref || libro.id}`}
          className="block bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07c19] flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-28 bg-[#f3f3f3] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                {libro.imagen_url ? (
                  <img
                    src={libro.imagen_url}
                    alt={libro.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* Etiqueta ISBN */}
                {libro.isbn && (
                  <span className="text-[10px] font-mono text-[#b07c19] bg-[#f3f3f3] px-2 py-0.5 rounded-md border border-gray-200 font-semibold">
                    {libro.isbn}
                  </span>
                )}
                <h3 className="font-bold text-[#252525] text-sm mt-1.5 line-clamp-2 leading-snug">
                  {libro.titulo}
                </h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-medium">
                  <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{libro.autor_nombre || 'Desconocido'}</span>
                </p>
                {/* Etiqueta de categoría */}
                {libro.categoria_nombre && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-600 bg-[#f3f3f3] px-2 py-0.5 rounded-md border border-gray-200 font-medium">
                    <Tag className="w-2.5 h-2.5 text-[#b07c19]" />
                    {libro.categoria_nombre}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
              {libro.resena}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#b07c19] font-mono font-bold">
              <Layers className="w-3.5 h-3.5 text-[#e19922]" />
              <span>Stock Total: {libro.stock_total || 0}</span>
            </div>
            <span className="font-bold text-[#252525]">
              {formatPrecio(libro.precio)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

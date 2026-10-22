import { Link } from 'react-router-dom';
import { BookOpen, User, Building2, Tag, Layers, ArrowLeft } from 'lucide-react';
import { formatPrecio } from '../../../utils/formatters';
import DisponibilidadItem from './DisponibilidadItem';

export default function FichaLibro({ libro, onVolver, esAdmin, onFijarPrecio }) {
  const precioTexto = formatPrecio(libro.precio);
  const disponibilidadLista = Array.isArray(libro.disponibilidad) ? libro.disponibilidad : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#b07c19] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver al catálogo</span>
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Portada */}
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 sm:w-64 h-80 sm:h-96 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex items-center justify-center relative">
            {libro.imagen_url ? (
              <img
                src={libro.imagen_url}
                alt={libro.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                <span className="text-xs text-gray-400 font-medium">Sin imagen de portada</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadatos y Disponibilidad */}
        <div className="md:col-span-8 space-y-6">
          {/* Encabezado */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {libro.categoria_id && libro.categoria_nombre && (
                <Link
                  to={`/catalogo?categoriaId=${libro.categoria_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#252525] bg-[#e8c85e] hover:bg-[#b07c19] hover:text-white px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                >
                  <Tag className="w-3 h-3" />
                  <span>{libro.categoria_nombre}</span>
                </Link>
              )}
              {libro.isbn && (
                <span className="text-xs font-mono font-semibold text-gray-600 bg-[#f3f3f3] border border-gray-200 px-2.5 py-1 rounded-lg">
                  ISBN: {libro.isbn}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight leading-snug">
              {libro.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
              <p className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-[#b07c19]" />
                <span className="font-bold text-[#252525]">{libro.autor_nombre || 'Autor desconocido'}</span>
              </p>
              {libro.editorial_nombre && (
                <p className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{libro.editorial_nombre}</span>
                </p>
              )}
            </div>

            <div className="pt-2">
              <span className="text-2xl font-extrabold text-[#252525] font-mono">
                {precioTexto}
              </span>
              {esAdmin && (
                <button
                  type="button"
                  onClick={onFijarPrecio}
                  className="ml-3 align-middle px-3 py-1.5 rounded-xl text-xs font-bold text-[#252525] bg-[#e8c85e] hover:bg-[#b07c19] hover:text-white transition-colors cursor-pointer"
                >
                  {Number(libro.precio) > 0 ? 'Cambiar precio' : 'Fijar precio'}
                </button>
              )}
            </div>
          </div>

          {/* Reseña */}
          {libro.resena && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#b07c19]">Sinopsis / Reseña</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {libro.resena}
              </p>
            </div>
          )}

          {/* Disponibilidad */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#e19922]" />
                <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider">Disponibilidad en Tiendas</h2>
              </div>
              <span className="text-xs font-mono font-extrabold text-[#b07c19]">
                Stock Total: {libro.stock_total || 0}
              </span>
            </div>

            {disponibilidadLista.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center font-medium">
                Sin existencias registradas por el momento
              </p>
            ) : (
              <div className="space-y-2.5">
                {disponibilidadLista.map((disp, idx) => (
                  <DisponibilidadItem
                    key={`${disp.sucursal_nombre}-${disp.bodega_nombre}-${idx}`}
                    item={disp}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

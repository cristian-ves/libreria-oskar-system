import React from 'react';
import { BookOpen, User, Building2, Tag, Layers, CheckCircle } from 'lucide-react';

export default function BookCard({ data, bodegaNombre }) {
  if (!data || !data.libro) return null;

  const { libro, inventario, movimiento, es_nuevo_en_catalogo } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
      {/* Indicador de estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e19922] shrink-0" />
          <span className="text-xs font-bold text-[#b07c19] uppercase tracking-wider">
            {es_nuevo_en_catalogo ? 'Nuevo en Catálogo' : 'Catálogo Existente'}
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-gray-600 bg-[#f3f3f3] px-2.5 py-1 rounded-lg border border-gray-200">
          ISBN: {libro.isbn}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Portada */}
        <div className="w-full sm:w-36 h-52 bg-[#f3f3f3] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center relative shadow-xs">
          {libro.imagen_url ? (
            <img
              src={libro.imagen_url}
              alt={libro.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <BookOpen className="w-10 h-10 mb-2 text-gray-400" />
              <span className="text-[10px] font-medium text-gray-500">Sin portada digital</span>
            </div>
          )}
        </div>

        {/* Detalles del Libro */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#252525] tracking-tight leading-snug mb-2">
              {libro.titulo}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#b07c19] flex-shrink-0" />
                <span className="text-gray-500">Autor:</span>
                <span className="font-semibold text-[#252525] truncate">{libro.autor || 'Desconocido'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#b07c19] flex-shrink-0" />
                <span className="text-gray-500">Editorial:</span>
                <span className="font-semibold text-[#252525] truncate">{libro.editorial || 'Independiente'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#b07c19] flex-shrink-0" />
                <span className="text-gray-500">Precio Ref.:</span>
                <span className="font-bold text-[#252525]">
                  {Number(libro.precio) > 0 ? 'Q ' + Number(libro.precio).toFixed(2) : 'Precio por confirmar'}
                </span>
              </div>
            </div>

            {/* Reseña */}
            <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200 mb-4">
              <span className="text-[11px] font-bold text-gray-600 block mb-1 uppercase tracking-wider">
                Reseña descriptiva:
              </span>
              <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">
                {libro.resena}
              </p>
            </div>
          </div>

          {/* Estado de Inventario y Movimiento */}
          <div className="bg-[#f3f3f3] border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#e19922] text-[#252525] flex items-center justify-center font-bold shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-[#b07c19] font-bold">
                  {bodegaNombre || 'Bodega Asignada'}
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  Stock: <span className="text-gray-500">{inventario.stock_anterior}</span> →{' '}
                  <span className="text-[#252525] font-bold text-sm">{inventario.stock_actual} unidades</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#252525] bg-[#e8c85e] px-2.5 py-1 rounded-md shadow-xs">
                <CheckCircle className="w-3 h-3" />
                +1 {movimiento.tipo}
              </span>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                {new Date(movimiento.fecha_movimiento).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

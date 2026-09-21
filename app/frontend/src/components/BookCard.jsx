import React from 'react';
import { BookOpen, User, Building2, Tag, Calendar, Layers, CheckCircle } from 'lucide-react';

export default function BookCard({ data, bodegaNombre }) {
  if (!data || !data.libro) return null;

  const { libro, inventario, movimiento, es_nuevo_en_catalogo } = data;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40">
      {/* Indicador de estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            {es_nuevo_en_catalogo ? 'Nuevo en Catálogo' : 'Catálogo Existente'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
          ISBN: {libro.isbn}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Portada */}
        <div className="w-full sm:w-36 h-52 bg-slate-950 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800 flex items-center justify-center relative shadow-lg">
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
            <div className="flex flex-col items-center justify-center text-slate-600 p-4 text-center">
              <BookOpen className="w-10 h-10 mb-2 text-slate-500" />
              <span className="text-[10px] font-medium text-slate-400">Sin portada digital</span>
            </div>
          )}
        </div>

        {/* Detalles del Libro */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-snug mb-2">
              {libro.titulo}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300 mb-3">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-400">Autor:</span>
                <span className="font-medium text-white truncate">{libro.autor || 'Desconocido'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span className="text-slate-400">Editorial:</span>
                <span className="font-medium text-white truncate">{libro.editorial || 'Independiente'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-slate-400">Precio Ref.:</span>
                <span className="font-semibold text-white">Q {Number(libro.precio).toFixed(2)}</span>
              </div>
            </div>

            {/* Reseña */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                Reseña descriptiva:
              </span>
              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                {libro.resena}
              </p>
            </div>
          </div>

          {/* Estado de Inventario y Movimiento Atómico */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-300 font-medium">
                  {bodegaNombre || 'Bodega Asignada'}
                </p>
                <p className="text-xs text-slate-300 font-mono">
                  Stock: <span className="text-slate-400">{inventario.stock_anterior}</span> →{' '}
                  <span className="text-emerald-400 font-bold text-sm">{inventario.stock_actual} unidades</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle className="w-3 h-3" />
                +1 {movimiento.tipo}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {new Date(movimiento.fecha_movimiento).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

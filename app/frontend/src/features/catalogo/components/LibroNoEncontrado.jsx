import { BookOpen, ArrowLeft } from 'lucide-react';

export default function LibroNoEncontrado({ onVolver }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="bg-white border border-gray-200 rounded-2xl p-12 max-w-lg mx-auto shadow-sm">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#252525] mb-2">Libro no encontrado</h1>
        <p className="text-xs text-gray-500 mb-6">
          El ejemplar que buscas no existe o fue retirado del catálogo disponible.
        </p>
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo</span>
        </button>
      </div>
    </div>
  );
}

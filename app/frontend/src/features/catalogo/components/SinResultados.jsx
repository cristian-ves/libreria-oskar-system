import { BookOpen } from 'lucide-react';

export default function SinResultados({
  searchTerm,
  categoriaNombre,
  hayFiltros,
  onLimpiarFiltros,
  authLoading,
  puedeRegistrar,
  onNavigateToScanner,
}) {
  return (
      <div className="w-full min-h-[50vh] flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center w-full shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#252525] mb-1">
            No se encontraron libros
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            {searchTerm && categoriaNombre
              ? `No hay coincidencias para "${searchTerm}" en ${categoriaNombre}.`
              : searchTerm
              ? `No hay coincidencias para "${searchTerm}".`
              : categoriaNombre
              ? `No hay libros registrados en ${categoriaNombre}.`
              : 'Aún no se han registrado libros en el inventario.'}
          </p>
          {hayFiltros ? (
            <button
              type="button"
              onClick={onLimpiarFiltros}
              className="text-xs font-bold text-[#b07c19] hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          ) : (
            !authLoading && puedeRegistrar && (
              <button
                type="button"
                onClick={onNavigateToScanner}
                className="text-xs font-bold text-[#b07c19] hover:underline cursor-pointer"
              >
                Ir a Registrar Libro con Escáner →
              </button>
            )
          )}
        </div>
      </div>
  );
}

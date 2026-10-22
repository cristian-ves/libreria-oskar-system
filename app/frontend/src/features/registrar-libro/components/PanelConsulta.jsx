import { Barcode, ArrowRight, PlusCircle, BookOpen } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';

export default function PanelConsulta({ errorBox, isbnInput, setIsbnInput, isLoading, onConsultar, onAgregarManual }) {
  return (
    <div className="lg:col-span-8 space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-5 flex items-center gap-2">
          <Barcode className="w-4 h-4 text-[#e19922]" />
          Paso 1 — Consultar ISBN
        </h2>

        <ErrorBox error={errorBox} />

        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel required>Código ISBN</FieldLabel>
            <div className="flex gap-2">
              <Input
                type="text"
                value={isbnInput}
                onChange={e => setIsbnInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onConsultar()}
                placeholder="Ej. 9780132350884"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => onConsultar()}
                disabled={isLoading || !isbnInput.trim()}
                className="inline-flex items-center gap-1.5 bg-[#e19922] hover:bg-[#b07c19] disabled:opacity-50 text-[#252525] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <ArrowRight className="w-4 h-4" />
                Consultar
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Puedes teclear el ISBN manualmente o capturarlo con la cámara.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-bold">o</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            type="button"
            onClick={onAgregarManual}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] disabled:opacity-50 text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 text-[#e19922]" />
            Agregar manualmente sin ISBN
          </button>
        </div>
      </div>

      {/* Placeholder espera */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#f3f3f3] border border-gray-200 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base font-bold text-[#252525] mb-1">Esperando ISBN</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Cuando consultes un ISBN el sistema verificará si el libro ya está en el catálogo local.
          Si existe, podrás ingresar unidades directamente; si no, se abrirá el formulario de registro.
        </p>
      </div>
    </div>
  );
}

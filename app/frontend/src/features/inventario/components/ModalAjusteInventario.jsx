import { useState } from 'react';
import { Sliders, Info, AlertCircle, X } from 'lucide-react';
import { postAjuste } from '../../../services/api/inventario.api';
import Modal from '../../../components/ui/Modal';

export default function ModalAjusteInventario({ selectedItem, onClose, onSuccess }) {
  const [formStockNuevo, setFormStockNuevo] = useState(selectedItem.stock_actual);
  const [formMotivo, setFormMotivo] = useState('');
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAjusteSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    const stockNuevo = Number(formStockNuevo);
    if (!Number.isInteger(stockNuevo) || stockNuevo < 0) {
      setModalError({ message: 'El stock nuevo debe ser un número entero mayor o igual a 0.' });
      return;
    }

    if (!formMotivo.trim()) {
      setModalError({ message: 'El motivo del ajuste es obligatorio.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await postAjuste(selectedItem.inventario_id, {
        stockNuevo,
        motivo: formMotivo.trim(),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError({
          message: json.message || 'Error al procesar el ajuste.',
          details: json.details,
        });
        return;
      }

      onSuccess({
        type: 'success',
        title: '¡Ajuste de Stock Aplicado!',
        bookTitle: selectedItem.titulo,
        message: `Stock fijado en ${json.data?.inventario?.stock_actual} uds. (Anterior: ${json.data?.stock_anterior}).`,
      });
    } catch (err) {
      setModalError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-[#252525] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#b07c19]" />
            Ajuste de Stock / Auditoría
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Bodega: {selectedItem.bodega_nombre} ({selectedItem.sucursal_nombre})
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="text-gray-400 hover:text-[#252525] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ficha del libro */}
      <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between text-xs">
        <div className="min-w-0 pr-2">
          <p className="font-bold text-[#252525] truncate">{selectedItem.titulo}</p>
          <p className="text-gray-500 text-[11px] truncate">{selectedItem.autor || 'Autor no especificado'}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-500 uppercase block font-semibold">Stock actual</span>
          <span className="text-sm font-extrabold font-mono text-[#252525]">{selectedItem.stock_actual} uds.</span>
        </div>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
        <Info className="w-4 h-4 text-[#b07c19] shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          Este ajuste <strong className="text-[#252525]">FIJA</strong> el stock al valor que ingreses a continuación (establece el nuevo conteo físico, no suma ni resta).
        </p>
      </div>

      {modalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">{modalError.message}</p>
            {Array.isArray(modalError.details) && modalError.details.length > 0 && (
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-600">
                {modalError.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleAjusteSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#252525] mb-1.5">
            Stock Nuevo (conteo físico auditado) <span className="text-[#b07c19]">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={formStockNuevo}
            onChange={(e) => setFormStockNuevo(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#252525] mb-1.5">
            Motivo o justificación del ajuste <span className="text-[#b07c19]">*</span>
          </label>
          <textarea
            rows={3}
            value={formMotivo}
            onChange={(e) => setFormMotivo(e.target.value)}
            required
            placeholder="Ej. Conteo físico anual de inventario, merma por ejemplar dañado, corrección..."
            disabled={isSubmitting}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all placeholder:text-gray-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onClose()}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[#252525] bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Aplicando...' : 'Fijar Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from 'react';
import { ArrowDownRight, AlertCircle, X } from 'lucide-react';
import { postSalida } from '../../../services/api/inventario.api';
import Modal from '../../../components/ui/Modal';

export default function ModalSalidaInventario({ selectedItem, onClose, onSuccess }) {
  const [formCantidad, setFormCantidad] = useState(1);
  const [formMotivo, setFormMotivo] = useState('');
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    const cantidad = Number(formCantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setModalError({ message: 'La cantidad debe ser un número entero mayor o igual a 1.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await postSalida(selectedItem.inventario_id, {
        cantidad,
        motivo: formMotivo.trim() || undefined,
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError({
          message: json.message || 'Error al procesar la salida.',
          details: json.details,
        });
        return;
      }

      onSuccess({
        type: 'success',
        title: '¡Salida Registrada!',
        bookTitle: selectedItem.titulo,
        message: `Se descontaron ${cantidad} uds. Stock actual: ${json.data?.inventario?.stock_actual} uds.`,
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
            <ArrowDownRight className="w-5 h-5 text-red-600" />
            Registrar Salida de Mercancía
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

      <form onSubmit={handleSalidaSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#252525] mb-1.5">
            Cantidad a retirar <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={selectedItem.stock_actual}
            value={formCantidad}
            onChange={(e) => setFormCantidad(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 transition-all font-mono font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#252525] mb-1.5">
            Motivo de la salida (opcional)
          </label>
          <input
            type="text"
            value={formMotivo}
            onChange={(e) => setFormMotivo(e.target.value)}
            placeholder="Ej. Venta en mostrador, despacho a cliente..."
            disabled={isSubmitting}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all placeholder:text-gray-400"
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Salida'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

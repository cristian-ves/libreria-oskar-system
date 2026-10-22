import { useState, useRef } from 'react';
import { Ban, X } from 'lucide-react';
import { anularVenta } from '../../../services/api/ventas.api';
import Modal from '../../../components/ui/Modal';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';

const MOTIVO_MAX = 500;

export default function ModalAnularVenta({ venta, onClose, onSuccess }) {
  const enviandoRef = useRef(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    const texto = motivo.trim();
    if (!texto) {
      setError({ message: 'El motivo de la anulación es obligatorio.' });
      return;
    }
    if (texto.length > MOTIVO_MAX) {
      setError({ message: `El motivo no puede superar ${MOTIVO_MAX} caracteres.` });
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      const res = await anularVenta(venta.id, { motivo: texto });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: json.message || 'No se pudo anular la venta.', details: json.details });
        return;
      }
      onSuccess();
    } catch (err) {
      setError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <Modal>
      <div className="flex items-start justify-between">
        <h3 className="text-base font-bold text-[#252525] flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-600" />
          Anular venta {venta.codigo}
        </h3>
        <button type="button" onClick={onClose} disabled={enviando} className="text-gray-400 hover:text-[#252525] transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Se devolverá al inventario el stock de todas las líneas. Esta acción no se puede deshacer.
      </p>
      <ErrorBox error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>Motivo de la anulación</FieldLabel>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={MOTIVO_MAX}
            disabled={enviando}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 transition-all"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[#252525] bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {enviando ? 'Procesando...' : 'Confirmar anulación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

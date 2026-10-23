import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { actualizarPrecioLibro } from '../services/api/libros.api';
import { formatPrecio } from '../utils/formatters';
import Modal from './ui/Modal';
import ErrorBox from './ui/ErrorBox';
import FieldLabel from './ui/FieldLabel';
import Input from './ui/Input';

export default function ModalPrecioLibro({ libro, onClose, onSuccess }) {
  const [formPrecio, setFormPrecio] = useState(Number(libro.precio) > 0 ? String(libro.precio) : '');
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    try {
      setIsSubmitting(true);
      const res = await actualizarPrecioLibro(libro.id, formPrecio.trim());
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModalError({
          message: json.message || 'Error al actualizar el precio.',
          details: json.details,
        });
        return;
      }
      onSuccess(json.data);
    } catch (err) {
      setModalError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal>
      <div className="flex items-start justify-between">
        <h3 className="text-base font-bold text-[#252525] flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#b07c19]" />
          Fijar precio del libro
        </h3>
        <button
          type="button"
          onClick={() => onClose()}
          className="text-gray-400 hover:text-[#252525] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between text-xs">
        <p className="font-bold text-[#252525] truncate min-w-0 pr-2">{libro.titulo}</p>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-500 uppercase block font-semibold">Precio actual</span>
          <span className="text-sm font-extrabold font-mono text-[#252525]">{formatPrecio(libro.precio)}</span>
        </div>
      </div>

      <ErrorBox error={modalError} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel required>Nuevo precio (Q)</FieldLabel>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={formPrecio}
            onChange={(e) => setFormPrecio(e.target.value)}
            placeholder="0.00"
            required
            disabled={isSubmitting}
            className="font-mono font-bold"
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#252525] bg-[#e8c85e] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar precio'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

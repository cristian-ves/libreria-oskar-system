import { useRef, useState } from 'react';
import { FolderPlus, Pencil, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';

export default function FormularioCategoria({ categoria, guardando, error, onClose, onGuardar }) {
  const [nombre, setNombre] = useState(categoria?.nombre || '');
  const [errorLocal, setErrorLocal] = useState('');
  const envioActivo = useRef(false);
  const editando = Boolean(categoria);

  const enviar = async (event) => {
    event.preventDefault();
    if (envioActivo.current) return;
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorLocal('El nombre de la categoría es obligatorio.');
      return;
    }
    setErrorLocal('');
    envioActivo.current = true;
    try {
      await onGuardar(nombreLimpio);
    } finally {
      envioActivo.current = false;
    }
  };

  return (
    <Modal>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-formulario-categoria" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-formulario-categoria" className="text-lg font-extrabold text-[#252525] flex items-center gap-2">
              {editando ? <Pencil aria-hidden="true" className="w-5 h-5 text-[#b07c19]" /> : <FolderPlus aria-hidden="true" className="w-5 h-5 text-[#b07c19]" />}
              {editando ? 'Renombrar categoría' : 'Nueva categoría'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Escribe el nombre que verá el equipo en el catálogo.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar formulario" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#252525] disabled:opacity-40">
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <ErrorBox error={errorLocal ? { message: errorLocal } : error} />

        <form onSubmit={enviar} className="space-y-4" aria-labelledby="titulo-formulario-categoria">
          <div>
            <FieldLabel required>Nombre de categoría</FieldLabel>
            <Input
              aria-label="Nombre de categoría"
              autoFocus
              maxLength={100}
              required
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              disabled={guardando}
              placeholder="Ej. Literatura"
            />
          </div>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Las categorías cuyo nombre comienza por Derecho se agrupan automáticamente en Ramas del Derecho dentro del catálogo.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={guardando} className="min-h-11 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={guardando} className="min-h-11 px-4 py-2 rounded-xl text-sm font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 transition-colors">
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}

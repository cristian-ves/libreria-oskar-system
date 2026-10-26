import { useRef, useState } from 'react';
import { Building2, Pencil, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';

export default function FormularioSucursal({ sucursal, guardando, error, onClose, onGuardar }) {
  const [nombre, setNombre] = useState(sucursal?.nombre || '');
  const [direccion, setDireccion] = useState(sucursal?.direccion || '');
  const [telefono, setTelefono] = useState(sucursal?.telefono || '');
  const [errorLocal, setErrorLocal] = useState('');
  const enviando = useRef(false);
  const editar = Boolean(sucursal);

  const enviar = async (event) => {
    event.preventDefault();
    if (guardando || enviando.current) return;
    if (!nombre.trim() || !direccion.trim()) { setErrorLocal('Completa el nombre y la dirección.'); return; }
    setErrorLocal('');
    enviando.current = true;
    try { await onGuardar({ nombre: nombre.trim(), direccion: direccion.trim(), telefono: telefono.trim() || null }); }
    finally { enviando.current = false; }
  };

  return <Modal><section role="dialog" aria-modal="true" aria-labelledby="titulo-sucursal" className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h2 id="titulo-sucursal" className="flex items-center gap-2 text-lg font-extrabold text-[#252525]">
      {editar ? <Pencil aria-hidden="true" className="h-5 w-5 text-[#b07c19]" /> : <Building2 aria-hidden="true" className="h-5 w-5 text-[#b07c19]" />}
      {editar ? 'Editar sucursal' : 'Nueva sucursal'}
    </h2><p className="mt-1 text-xs text-gray-500">Los cambios se reflejan en las bodegas asociadas.</p></div>
      <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar formulario" className="min-h-11 min-w-11 rounded-lg text-gray-500"> <X aria-hidden="true" className="mx-auto h-5 w-5" /></button>
    </div>
    <ErrorBox error={errorLocal ? { message: errorLocal } : error} />
    <form onSubmit={enviar} className="space-y-4">
      <div><FieldLabel required>Nombre</FieldLabel><Input required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={guardando} /></div>
      <div><FieldLabel required>Dirección</FieldLabel><textarea required maxLength={1000} value={direccion} onChange={(e) => setDireccion(e.target.value)} disabled={guardando} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e19922] disabled:bg-gray-100" /></div>
      <div><FieldLabel>Teléfono</FieldLabel><Input maxLength={20} value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={guardando} /></div>
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={guardando} className="min-h-11 rounded-xl border border-gray-200 bg-gray-100 px-4 text-sm font-semibold">Cancelar</button>
        <button type="submit" disabled={guardando} className="min-h-11 rounded-xl bg-[#e19922] px-4 text-sm font-bold text-[#252525] disabled:opacity-50">{guardando ? 'Guardando…' : editar ? 'Guardar cambios' : 'Crear sucursal'}</button>
      </div>
    </form>
  </section></Modal>;
}

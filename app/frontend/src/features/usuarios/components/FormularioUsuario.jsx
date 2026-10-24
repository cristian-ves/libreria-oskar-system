import { useState } from 'react';
import { AlertTriangle, ShieldCheck, UserRoundPlus, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { ROLES } from '../../../utils/roles';

const passwordValida = (password) =>
  Array.from(password).length >= 10 && /\p{L}/u.test(password) && /\p{N}/u.test(password) &&
  new TextEncoder().encode(password).length <= 72;

export default function FormularioUsuario({ usuario, guardando, error, onClose, onGuardar }) {
  const editando = Boolean(usuario);
  const [nombre, setNombre] = useState(usuario?.nombre_completo || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [rol, setRol] = useState(usuario?.rol_nombre || ROLES.EMPLEADO);
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState(null);
  const [confirmarDesactivacion, setConfirmarDesactivacion] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    setErrorLocal(null);
    if (editando && usuario.activo && !activo && !confirmarDesactivacion) {
      setConfirmarDesactivacion(true);
      return;
    }
    if (!editando && !passwordValida(password)) {
      setErrorLocal({ message: 'La contraseña debe tener al menos 10 caracteres, una letra y un número, y no superar 72 bytes en UTF-8.' });
      return;
    }
    const datos = {
      nombre_completo: nombre.trim(),
      email: email.trim().toLowerCase(),
      rol,
      ...(editando ? { activo } : { password }),
    };
    await onGuardar(datos);
  };

  return (
    <Modal>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="titulo-formulario-usuario" className="text-lg font-extrabold text-[#252525] flex items-center gap-2">
            {editando ? <ShieldCheck className="w-5 h-5 text-[#b07c19]" /> : <UserRoundPlus className="w-5 h-5 text-[#b07c19]" />}
            {editando ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Completa los datos de acceso y el rol asignado.</p>
        </div>
        <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar formulario" className="p-1 text-gray-400 hover:text-[#252525] disabled:opacity-40">
          <X aria-hidden="true" className="w-5 h-5" />
        </button>
      </div>

      <ErrorBox error={errorLocal || error} />

      <form onSubmit={enviar} className="space-y-3" aria-labelledby="titulo-formulario-usuario">
        <div>
          <FieldLabel required>Nombre completo</FieldLabel>
          <Input aria-label="Nombre completo" autoComplete="name" maxLength={150} required value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={guardando} placeholder="Nombre y apellidos" />
        </div>
        <div>
          <FieldLabel required>Correo electrónico</FieldLabel>
          <Input aria-label="Correo electrónico" type="email" autoComplete="email" maxLength={150} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={guardando} placeholder="nombre@correo.com" />
        </div>
        {!editando && (
          <div>
            <FieldLabel required>Contraseña</FieldLabel>
            <Input aria-label="Contraseña" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={guardando} placeholder="Define una contraseña segura" />
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
              Mínimo 10 caracteres, al menos una letra y un número, máximo 72 bytes en UTF-8.
            </p>
          </div>
        )}
        <div>
          <FieldLabel required>Rol</FieldLabel>
          <Select aria-label="Rol del usuario" required value={rol} onChange={(event) => setRol(event.target.value)} disabled={guardando}>
            <option value={ROLES.ADMINISTRADOR}>{ROLES.ADMINISTRADOR}</option>
            <option value={ROLES.EMPLEADO}>{ROLES.EMPLEADO}</option>
          </Select>
        </div>
        {editando && (
          <div>
            <FieldLabel required>Estado</FieldLabel>
            <Select aria-label="Estado del usuario" value={activo ? 'activo' : 'inactivo'} onChange={(event) => { setActivo(event.target.value === 'activo'); setConfirmarDesactivacion(false); }} disabled={guardando}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </div>
        )}
        {confirmarDesactivacion && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Confirma que deseas desactivar esta cuenta. El backend impedirá desactivar tu propia cuenta o dejar el sistema sin administradores activos.</p>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={guardando} className="min-h-11 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={guardando} className="min-h-11 px-4 py-2 rounded-xl text-sm font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : confirmarDesactivacion ? 'Confirmar desactivación' : editando ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { Pencil, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';
import { ROLES } from '../../../utils/roles';

function Estado({ activo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Acciones({ usuario, currentUserId, onEditar, onCambiarEstado }) {
  const esPropio = usuario.id === currentUserId;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onEditar(usuario)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-[#252525] hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b07c19]">
        <Pencil aria-hidden="true" className="w-3.5 h-3.5" /><span>Editar</span>
      </button>
      {esPropio ? (
        <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-[11px] font-semibold text-gray-500" title="No puedes desactivar tu propia cuenta">
          <UserRoundX aria-hidden="true" className="w-3.5 h-3.5" /><span>No puedes desactivar</span>
        </span>
      ) : (
        <button type="button" onClick={() => onCambiarEstado(usuario)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 ${usuario.activo ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-red-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-emerald-500'}`}>
          {usuario.activo ? <UserRoundX aria-hidden="true" className="w-3.5 h-3.5" /> : <UserRoundCheck aria-hidden="true" className="w-3.5 h-3.5" />}
          <span>{usuario.activo ? 'Desactivar' : 'Activar'}</span>
        </button>
      )}
    </div>
  );
}

function RolBadge({ rol }) {
  const admin = rol === ROLES.ADMINISTRADOR;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${admin ? 'bg-amber-50 text-[#8a5b08] border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{rol}</span>;
}

export default function TablaUsuarios({ usuarios, totalUsuarios, cargando, error, currentUserId, onEditar, onCambiarEstado, onReintentar }) {
  if (cargando) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm" role="status" aria-live="polite">
        <div className="w-9 h-9 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorBox error={error} />
        <button type="button" onClick={onReintentar} className="min-h-10 px-4 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white">Reintentar</button>
      </div>
    );
  }

  if (!usuarios.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
        <UsersRound aria-hidden="true" className="w-11 h-11 text-gray-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#252525] mb-1">{totalUsuarios ? 'No hay coincidencias' : 'No hay usuarios'}</h2>
        <p className="text-sm text-gray-500">{totalUsuarios ? 'Prueba con otro nombre, correo, rol o estado.' : 'Cuando registres usuarios, aparecerán aquí.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup><col className="w-[27%]" /><col className="w-[25%]" /><col className="w-[15%]" /><col className="w-[11%]" /><col className="w-[22%]" /></colgroup>
          <thead className="bg-[#f3f3f3] text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
            <tr><th scope="col" className="px-4 py-3.5">Usuario</th><th scope="col" className="px-4 py-3.5">Correo electrónico</th><th scope="col" className="px-4 py-3.5">Rol</th><th scope="col" className="px-4 py-3.5">Estado</th><th scope="col" className="px-4 py-3.5">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-[#252525] break-words">{usuario.nombre_completo}</td>
                <td className="px-4 py-3.5 text-gray-600 text-xs break-all">{usuario.email}</td>
                <td className="px-4 py-3.5"><RolBadge rol={usuario.rol_nombre} /></td>
                <td className="px-4 py-3.5"><Estado activo={usuario.activo} /></td>
                <td className="px-4 py-3.5"><Acciones usuario={usuario} currentUserId={currentUserId} onEditar={onEditar} onCambiarEstado={onCambiarEstado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {usuarios.map((usuario) => (
          <article key={usuario.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold text-[#252525] break-words">{usuario.nombre_completo}</h2>
                <p className="mt-1 text-xs text-gray-500 break-all">{usuario.email}</p>
              </div>
              <Estado activo={usuario.activo} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <RolBadge rol={usuario.rol_nombre} />
              <Acciones usuario={usuario} currentUserId={currentUserId} onEditar={onEditar} onCambiarEstado={onCambiarEstado} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

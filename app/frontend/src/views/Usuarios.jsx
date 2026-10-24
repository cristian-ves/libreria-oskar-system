import { useState } from 'react';
import { CircleCheck, ShieldCheck, UserRoundCheck, UserRoundX, UsersRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import ErrorBox from '../components/ui/ErrorBox';
import FiltrosUsuarios from '../features/usuarios/components/FiltrosUsuarios';
import FormularioUsuario from '../features/usuarios/components/FormularioUsuario';
import TablaUsuarios from '../features/usuarios/components/TablaUsuarios';
import useUsuarios from '../features/usuarios/hooks/useUsuarios';

function TarjetaResumen({ titulo, valor, detalle, Icon, color }) {
  return (
    <article className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center gap-3 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon aria-hidden="true" className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 truncate">{titulo}</p>
        <p className="text-2xl leading-tight font-extrabold text-[#252525]">{valor}</p>
        <p className="text-[11px] text-gray-500 truncate">{detalle}</p>
      </div>
    </article>
  );
}

export default function Usuarios() {
  const { user } = useAuth();
  const [confirmacionError, setConfirmacionError] = useState(null);
  const {
    usuarios, usuariosFiltrados, resumen, cargando, guardando, errorCarga, errorOperacion, mensaje,
    busqueda, setBusqueda, filtroRol, setFiltroRol, filtroEstado, setFiltroEstado,
    formularioAbierto, usuarioEditando, usuarioPendienteEstado,
    cargar, abrirCrear, abrirEditar, cerrarFormulario, guardar,
    solicitarCambioEstado, cancelarCambioEstado, confirmarCambioEstado,
    limpiarMensaje, limpiarErrorOperacion,
  } = useUsuarios();

  const toggleEstado = (usuario) => {
    setConfirmacionError(null);
    solicitarCambioEstado(usuario);
  };

  const confirmarEstado = async () => {
    setConfirmacionError(errorOperacion);
    await confirmarCambioEstado();
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#e19922]" />
            <span>Administración</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">Gestión de usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">Administra las cuentas y sus permisos de acceso.</p>
        </div>
        <button type="button" onClick={abrirCrear} className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white transition-colors shadow-sm">
          <UsersRound aria-hidden="true" className="w-4 h-4" />
          <span>Nuevo usuario</span>
        </button>
      </header>

      {mensaje && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" aria-live="polite">
          <CircleCheck aria-hidden="true" className="w-5 h-5 shrink-0" />
          <p className="flex-1">{mensaje}</p>
          <button type="button" onClick={limpiarMensaje} aria-label="Cerrar confirmación" className="min-h-11 min-w-11 flex items-center justify-center rounded p-0.5 hover:bg-emerald-100"><X aria-hidden="true" className="w-4 h-4" /></button>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5" aria-label="Resumen de usuarios">
        <TarjetaResumen titulo="Usuarios" valor={resumen.total} detalle="Cuentas registradas" Icon={UsersRound} color="bg-amber-50 text-[#9a670b]" />
        <TarjetaResumen titulo="Activos" valor={resumen.activos} detalle="Con acceso habilitado" Icon={UserRoundCheck} color="bg-emerald-50 text-emerald-700" />
        <TarjetaResumen titulo="Inactivos" valor={resumen.inactivos} detalle="Acceso deshabilitado" Icon={UserRoundX} color="bg-gray-100 text-gray-600" />
        <TarjetaResumen titulo="Administradores activos" valor={resumen.administradores} detalle="Con permisos administrativos" Icon={ShieldCheck} color="bg-blue-50 text-blue-700" />
      </section>

      <div className="space-y-4">
        <FiltrosUsuarios
          busqueda={busqueda} setBusqueda={setBusqueda}
          rol={filtroRol} setRol={setFiltroRol}
          estado={filtroEstado} setEstado={setFiltroEstado}
        />
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <span role="status" aria-live="polite">{cargando ? 'Actualizando listado...' : `${usuariosFiltrados.length} de ${resumen.total} usuarios`}</span>
          {(busqueda || filtroRol || filtroEstado) && (
            <button type="button" onClick={() => { setBusqueda(''); setFiltroRol(''); setFiltroEstado(''); }} className="font-bold text-[#8a5b08] hover:underline">Limpiar filtros</button>
          )}
        </div>
        <TablaUsuarios
          usuarios={usuariosFiltrados}
          totalUsuarios={resumen.total}
          cargando={cargando}
          error={errorCarga}
          currentUserId={user?.id}
          onEditar={abrirEditar}
          onCambiarEstado={toggleEstado}
          onReintentar={cargar}
        />
      </div>

      {formularioAbierto && (
        <FormularioUsuario
          key={usuarioEditando?.id || 'nuevo'}
          usuario={usuarioEditando}
          guardando={guardando}
          error={errorOperacion}
          onClose={() => { cerrarFormulario(); limpiarErrorOperacion(); }}
          onGuardar={guardar}
        />
      )}

      {usuarioPendienteEstado && (
        <Modal>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="confirmar-estado-usuario" className="text-lg font-extrabold text-[#252525]">{usuarioPendienteEstado.activo ? 'Desactivar usuario' : 'Activar usuario'}</h2>
              <p className="mt-1 text-xs text-gray-500 break-all">{usuarioPendienteEstado.email}</p>
            </div>
            <button type="button" onClick={() => { cancelarCambioEstado(); limpiarErrorOperacion(); setConfirmacionError(null); }} disabled={guardando} aria-label="Cerrar confirmación" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#252525] disabled:opacity-40"><X aria-hidden="true" className="w-5 h-5" /></button>
          </div>
          {(confirmacionError || errorOperacion) && <ErrorBox error={errorOperacion || confirmacionError} />}
          <p className="text-sm text-gray-600">
            {usuarioPendienteEstado.activo
              ? '¿Confirmas que deseas desactivar esta cuenta? El usuario dejará de poder iniciar sesión.'
              : '¿Confirmas que deseas volver a activar esta cuenta?'}
          </p>
          <p className="text-xs text-gray-500">No se eliminará el usuario ni su historial. El servidor validará que no sea tu propia cuenta ni el último administrador activo.</p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => { cancelarCambioEstado(); limpiarErrorOperacion(); setConfirmacionError(null); }} disabled={guardando} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={confirmarEstado} disabled={guardando} className={`min-h-11 px-4 rounded-xl text-sm font-bold disabled:opacity-50 ${usuarioPendienteEstado.activo ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              {guardando ? 'Procesando...' : usuarioPendienteEstado.activo ? 'Confirmar desactivación' : 'Confirmar activación'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

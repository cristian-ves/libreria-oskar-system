import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  actualizarUsuario, cambiarEstadoUsuario, crearUsuario, getUsuarios,
} from '../../../services/api/usuarios.api';
import { ROLES } from '../../../utils/roles';

async function leerRespuesta(response, mensajePredeterminado) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.message || mensajePredeterminado);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json.data;
}

function normalizar(texto) {
  return String(texto || '').trim().toLocaleLowerCase('es');
}

export default function useUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [usuarioPendienteEstado, setUsuarioPendienteEstado] = useState(null);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setErrorCarga(null);
    try {
      const data = await leerRespuesta(await getUsuarios({ incluirInactivos: true }), 'No se pudieron cargar los usuarios.');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorCarga({ message: error.message || 'Error de conexión al cargar usuarios.', details: error.details });
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const usuariosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    return usuarios.filter((usuario) => {
      const coincideBusqueda = !termino || normalizar(`${usuario.nombre_completo} ${usuario.email}`).includes(termino);
      const coincideRol = !filtroRol || usuario.rol_nombre === filtroRol;
      const coincideEstado = !filtroEstado || (filtroEstado === 'activo' ? usuario.activo : !usuario.activo);
      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const resumen = useMemo(() => ({
    total: usuarios.length,
    activos: usuarios.filter((usuario) => usuario.activo).length,
    inactivos: usuarios.filter((usuario) => !usuario.activo).length,
    administradores: usuarios.filter((usuario) => usuario.rol_nombre === ROLES.ADMINISTRADOR && usuario.activo).length,
  }), [usuarios]);

  const abrirCrear = () => { setUsuarioEditando(null); setErrorOperacion(null); setFormularioAbierto(true); };
  const abrirEditar = (usuario) => { setUsuarioEditando(usuario); setErrorOperacion(null); setFormularioAbierto(true); };
  const cerrarFormulario = () => { if (!guardando) setFormularioAbierto(false); };

  const guardar = async (datos) => {
    if (guardando) return false;
    setGuardando(true); setErrorOperacion(null); setMensaje('');
    try {
      const response = usuarioEditando
        ? await actualizarUsuario(usuarioEditando.id, datos)
        : await crearUsuario(datos);
      await leerRespuesta(response, 'No se pudo guardar el usuario.');
      setFormularioAbierto(false);
      setMensaje(usuarioEditando ? 'Los datos del usuario se actualizaron.' : 'El usuario se creó correctamente.');
      await cargar({ silencioso: true });
      return true;
    } catch (error) {
      setErrorOperacion({ message: error.message || 'Error de conexión al guardar.', details: error.details, status: error.status });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCambioEstado = (usuario) => { setErrorOperacion(null); setUsuarioPendienteEstado(usuario); };
  const cancelarCambioEstado = () => { if (!guardando) setUsuarioPendienteEstado(null); };
  const confirmarCambioEstado = async () => {
    if (!usuarioPendienteEstado || guardando) return;
    const usuario = usuarioPendienteEstado;
    const nuevoEstado = !usuario.activo;
    setGuardando(true); setErrorOperacion(null); setMensaje('');
    try {
      await leerRespuesta(await cambiarEstadoUsuario(usuario.id, nuevoEstado), 'No se pudo cambiar el estado del usuario.');
      setUsuarioPendienteEstado(null);
      setMensaje(nuevoEstado ? 'El usuario quedó activo.' : 'El usuario quedó inactivo.');
      await cargar({ silencioso: true });
    } catch (error) {
      let message = error.message || 'Error de conexión al cambiar el estado.';
      if (error.status === 409 && message === 'El recurso ya existe.') message = 'La operación encontró un conflicto. Revisa si se trata del último administrador activo.';
      if (/propia cuenta/i.test(message)) message = 'No puedes desactivar tu propia cuenta.';
      if (/Administrador activo/i.test(message)) message = 'No se puede desactivar al último administrador activo.';
      setErrorOperacion({ message, details: error.details, status: error.status });
    } finally {
      setGuardando(false);
    }
  };

  return {
    usuarios, usuariosFiltrados, resumen, cargando, guardando, errorCarga, errorOperacion, mensaje,
    busqueda, setBusqueda, filtroRol, setFiltroRol, filtroEstado, setFiltroEstado,
    formularioAbierto, usuarioEditando, usuarioPendienteEstado,
    cargar, abrirCrear, abrirEditar, cerrarFormulario, guardar,
    solicitarCambioEstado, cancelarCambioEstado, confirmarCambioEstado,
    limpiarMensaje: () => setMensaje(''), limpiarErrorOperacion: () => setErrorOperacion(null),
  };
}

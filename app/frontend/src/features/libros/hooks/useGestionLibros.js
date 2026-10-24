import { useCallback, useEffect, useRef, useState } from 'react';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { getCategorias } from '../../../services/api/categorias.api';
import { cambiarEstadoLibro, editarLibro, getLibrosAdministracion } from '../../../services/api/librosAdmin.api';

async function leerRespuesta(response, mensajePredeterminado) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.message || mensajePredeterminado);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json;
}

export default function useGestionLibros() {
  const [libros, setLibros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [estado, setEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorCategorias, setErrorCategorias] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [libroEditando, setLibroEditando] = useState(null);
  const [libroPendienteEstado, setLibroPendienteEstado] = useState(null);
  const [version, setVersion] = useState(0);
  const operacionActiva = useRef(false);
  const termino = useDebouncedValue(busqueda, 300);
  const offset = (pagina - 1) * limit;

  useEffect(() => {
    const controller = new AbortController();
    let vigente = true;
    setCargando(true);
    setErrorCarga(null);
    getLibrosAdministracion({ q: termino.trim(), categoriaId, estado, limit, offset }, { signal: controller.signal })
      .then((response) => leerRespuesta(response, 'No se pudieron cargar los libros.'))
      .then((json) => {
        if (!vigente) return;
        const elementos = Array.isArray(json.data) ? json.data : [];
        const cantidad = Number(json.total) || 0;
        setLibros(elementos);
        setTotal(cantidad);
        const ultimaPagina = Math.max(1, Math.ceil(cantidad / limit));
        if (pagina > ultimaPagina) setPagina(ultimaPagina);
      })
      .catch((error) => {
        if (!vigente || error.name === 'AbortError') return;
        setErrorCarga({ message: error.message || 'Error de conexión al cargar libros.', details: error.details });
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; controller.abort(); };
  }, [termino, categoriaId, estado, limit, offset, pagina, version]);

  useEffect(() => {
    let vigente = true;
    getCategorias().then((response) => leerRespuesta(response, 'No se pudieron cargar las categorías.'))
      .then((json) => { if (vigente) setCategorias(Array.isArray(json.data) ? json.data : []); })
      .catch((error) => { if (vigente) { setCategorias([]); setErrorCategorias({ message: error.message || 'No se pudieron cargar las categorías.' }); } })
      .finally(() => { if (vigente) setCargandoCategorias(false); });
    return () => { vigente = false; };
  }, []);

  const filtrosCambiaron = (setter) => (value) => { setter(value); setPagina(1); };
  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  const guardar = async (payload) => {
    if (!libroEditando || operacionActiva.current) return false;
    operacionActiva.current = true;
    setGuardando(true);
    setErrorOperacion(null); setMensaje('');
    try {
      await leerRespuesta(await editarLibro(libroEditando.id, payload), 'No se pudo guardar el libro.');
      setLibroEditando(null);
      setMensaje('Los datos bibliográficos se actualizaron correctamente.');
      recargar();
      return true;
    } catch (error) {
      setErrorOperacion({ message: error.message || 'Error de conexión al guardar el libro.', details: error.details, status: error.status });
      return false;
    } finally { operacionActiva.current = false; setGuardando(false); }
  };

  const cambiarEstado = async (libro) => {
    if (!libro || operacionActiva.current) return;
    const nuevoEstado = !libro.activo;
    operacionActiva.current = true;
    setGuardando(true);
    setErrorOperacion(null); setMensaje('');
    try {
      await leerRespuesta(await cambiarEstadoLibro(libro.id, nuevoEstado), 'No se pudo cambiar el estado del libro.');
      setLibroPendienteEstado(null);
      setMensaje(nuevoEstado ? 'El libro se reactivó correctamente.' : 'El libro se desactivó correctamente.');
      recargar();
    } catch (error) {
      setErrorOperacion({ message: error.message || 'Error de conexión al cambiar el estado.', details: error.details, status: error.status });
    } finally { operacionActiva.current = false; setGuardando(false); }
  };

  const confirmarCambioEstado = () => cambiarEstado(libroPendienteEstado);

  return {
    libros, categorias, total, limit, offset, pagina, busqueda, setBusqueda: filtrosCambiaron(setBusqueda),
    categoriaId, setCategoriaId: filtrosCambiaron(setCategoriaId), estado, setEstado: filtrosCambiaron(setEstado),
    cargando, cargandoCategorias, guardando, errorCarga, errorCategorias, errorOperacion, mensaje, libroEditando, setLibroEditando,
    libroPendienteEstado, setLibroPendienteEstado, guardar, cambiarEstado, confirmarCambioEstado, recargar,
    cambiarPagina: setPagina, cambiarLimit: (nuevoLimit) => { setLimit(nuevoLimit); setPagina(1); },
    limpiarMensaje: () => setMensaje(''), limpiarErrorOperacion: () => setErrorOperacion(null),
  };
}

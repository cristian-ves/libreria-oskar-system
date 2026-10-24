import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  crearCategoria, eliminarCategoria, getCategoriasAdministracion, renombrarCategoria,
} from '../../../services/api/categorias.api';

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

export default function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [categoriaPendienteEliminar, setCategoriaPendienteEliminar] = useState(null);
  const operacionActiva = useRef(false);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setErrorCarga(null);
    try {
      const data = await leerRespuesta(
        await getCategoriasAdministracion(),
        'No se pudieron cargar las categorías.'
      );
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorCarga({ message: error.message || 'Error de conexión al cargar categorías.', details: error.details });
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const categoriasFiltradas = useMemo(() => {
    const termino = normalizar(busqueda);
    return categorias.filter((categoria) => !termino || normalizar(categoria.nombre).includes(termino));
  }, [categorias, busqueda]);

  const resumen = useMemo(() => ({
    total: categorias.length,
    libros: categorias.reduce((total, categoria) => total + Number(categoria.libros_count || 0), 0),
  }), [categorias]);

  const abrirCrear = () => {
    setCategoriaEditando(null);
    setErrorOperacion(null);
    setFormularioAbierto(true);
  };

  const abrirEditar = (categoria) => {
    setCategoriaEditando(categoria);
    setErrorOperacion(null);
    setFormularioAbierto(true);
  };

  const cerrarFormulario = () => {
    if (!operacionActiva.current) setFormularioAbierto(false);
  };

  const guardar = async (nombre) => {
    if (operacionActiva.current) return false;
    operacionActiva.current = true;
    setGuardando(true);
    setErrorOperacion(null);
    setMensaje('');
    try {
      const response = categoriaEditando
        ? await renombrarCategoria(categoriaEditando.id, { nombre })
        : await crearCategoria({ nombre });
      await leerRespuesta(response, 'No se pudo guardar la categoría.');
      setFormularioAbierto(false);
      setMensaje(categoriaEditando ? 'La categoría se renombró correctamente.' : 'La categoría se creó correctamente.');
      await cargar({ silencioso: true });
      return true;
    } catch (error) {
      setErrorOperacion({ message: error.message || 'Error de conexión al guardar la categoría.', details: error.details, status: error.status });
      return false;
    } finally {
      operacionActiva.current = false;
      setGuardando(false);
    }
  };

  const solicitarEliminacion = (categoria) => {
    setErrorOperacion(null);
    setCategoriaPendienteEliminar(categoria);
  };

  const cancelarEliminacion = () => {
    if (!operacionActiva.current) {
      setCategoriaPendienteEliminar(null);
      setErrorOperacion(null);
    }
  };

  const confirmarEliminacion = async () => {
    if (!categoriaPendienteEliminar || operacionActiva.current) return;
    operacionActiva.current = true;
    setEliminando(true);
    setErrorOperacion(null);
    setMensaje('');
    try {
      await leerRespuesta(
        await eliminarCategoria(categoriaPendienteEliminar.id),
        'No se pudo eliminar la categoría.'
      );
      setCategoriaPendienteEliminar(null);
      setMensaje('La categoría se eliminó correctamente.');
      await cargar({ silencioso: true });
    } catch (error) {
      setErrorOperacion({ message: error.message || 'Error de conexión al eliminar la categoría.', details: error.details, status: error.status });
    } finally {
      operacionActiva.current = false;
      setEliminando(false);
    }
  };

  return {
    categorias, categoriasFiltradas, resumen, cargando, guardando, eliminando,
    errorCarga, errorOperacion, mensaje, busqueda, setBusqueda,
    formularioAbierto, categoriaEditando, categoriaPendienteEliminar,
    cargar, abrirCrear, abrirEditar, cerrarFormulario, guardar,
    solicitarEliminacion, cancelarEliminacion, confirmarEliminacion,
    limpiarMensaje: () => setMensaje(''), limpiarErrorOperacion: () => setErrorOperacion(null),
  };
}

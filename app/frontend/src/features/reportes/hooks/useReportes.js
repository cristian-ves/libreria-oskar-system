import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { consultarOpcionesStockObsoleto, consultarReporte, descargarReporte } from '../../../services/api/reportes.api';
import { getCategorias } from '../../../services/api/categorias.api';
import { getBodegas } from '../../../services/api/bodegas.api';
import { getUsuarios } from '../../../services/api/usuarios.api';
import { getLibrosAdministracion } from '../../../services/api/librosAdmin.api';
import { FILTROS_VACIOS, REPORTES } from '../reportes.config';

function mensajeEstado(status) {
  return ({ 400: 'Revisa los filtros: el servidor rechazó algún parámetro.', 401: 'La sesión venció. Inicia sesión nuevamente.', 403: 'Tu cuenta no tiene permiso para consultar reportes.', 429: 'Hay demasiadas solicitudes. Espera un momento y vuelve a intentar.', 413: 'El conjunto supera el límite de exportación. Reduce el rango o aplica más filtros.', 503: 'El servicio está ocupado con otras exportaciones. Intenta de nuevo en unos momentos.' })[status];
}

async function leerJson(response, mensaje) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(mensajeEstado(response.status) || json.message || mensaje);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json.data;
}

function hoyGuatemala() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function validarFiltros(reporte, filtros) {
  if (reporte.id === 'corte-caja' && !filtros.fecha) return 'Selecciona la fecha del corte.';
  if (['resumen-periodo'].includes(reporte.id) && (!filtros.desde || !filtros.hasta)) return 'Indica las fechas inicial y final.';
  const usaRango = ['libros-mas-vendidos', 'reposicion', 'kardex', 'ventas'].includes(reporte.id);
  if (usaRango && filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) return 'La fecha inicial no puede ser posterior a la fecha final.';
  if (reporte.id === 'stock-obsoleto' && (!/^\d+$/.test(filtros.diasSinVenta) || Number(filtros.diasSinVenta) < 1 || Number(filtros.diasSinVenta) > 3650)) return 'El período debe ser un entero entre 1 y 3650 días.';
  return '';
}

function nombreDescarga(header, tipo, formato) {
  const fecha = hoyGuatemala();
  const seguro = `reporte-${tipo}-${fecha}.${formato}`;
  if (!header) return seguro;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const normal = header.match(/filename="?([^";]+)"?/i)?.[1];
  const candidato = encoded || normal;
  if (!candidato) return seguro;
  try {
    const decoded = decodeURIComponent(candidato).replace(/[\\/\r\n";]/g, '_');
    return decoded.toLowerCase().endsWith(`.${formato}`) ? decoded : seguro;
  } catch { return seguro; }
}

export default function useReportes() {
  const [tipo, setTipo] = useState(REPORTES[0].id);
  const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS, fecha: hoyGuatemala(), desde: hoyGuatemala(), hasta: hoyGuatemala(), diasSinVenta: '180', libroActivo: 'activo' }));
  const [limit, setLimit] = useState(10);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [formatoExportando, setFormatoExportando] = useState('');
  const [errorExportacion, setErrorExportacion] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [busquedaLibro, setBusquedaLibro] = useState('');
  const [librosDisponibles, setLibrosDisponibles] = useState([]);
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [errorBusquedaLibro, setErrorBusquedaLibro] = useState('');
  const [catalogosError, setCatalogosError] = useState('');
  const [version, setVersion] = useState(0);
  const consultaId = useRef(0);
  const exportAbort = useRef(null);
  const exportLock = useRef(false);
  const reporte = useMemo(() => REPORTES.find((item) => item.id === tipo) || REPORTES[0], [tipo]);
  const offset = (pagina - 1) * limit;
  const validationError = validarFiltros(reporte, filtros);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    Promise.all([
      getCategorias({ signal: controller.signal }).then((res) => leerJson(res, 'No se pudieron cargar las categorías.')),
      getBodegas({ signal: controller.signal }).then((res) => leerJson(res, 'No se pudieron cargar las bodegas.')),
      getUsuarios({ incluirInactivos: true, signal: controller.signal }).then((res) => leerJson(res, 'No se pudieron cargar los vendedores.')),
      consultarOpcionesStockObsoleto({ signal: controller.signal }).then((res) => leerJson(res, 'No se pudieron cargar las sucursales.')),
    ]).then(([cats, bodegasData, usuarios, opcionesStock]) => {
      if (!mounted) return;
      setCategorias(Array.isArray(cats) ? cats : []);
      setBodegas(Array.isArray(bodegasData) ? bodegasData : []);
      setSucursales(Array.isArray(opcionesStock?.sucursales) ? opcionesStock.sucursales : []);
      setVendedores(Array.isArray(usuarios) ? usuarios.filter((user) => user.rol_nombre === 'Administrador' || user.rol_nombre === 'Empleado') : []);
    }).catch((err) => { if (mounted && err.name !== 'AbortError') setCatalogosError(err.message); });
    return () => { mounted = false; controller.abort(); };
  }, []);

  useEffect(() => {
    const termino = busquedaLibro.trim();
    if (!reporte.filtros.includes('libroId') || termino.length < 2) {
      setLibrosDisponibles(libroSeleccionado ? [libroSeleccionado] : []);
      setErrorBusquedaLibro('');
      return undefined;
    }
    const controller = new AbortController();
    let vigente = true;
    const timer = window.setTimeout(() => {
      getLibrosAdministracion({ q: termino, limit: 20, offset: 0 }, { signal: controller.signal })
        .then((response) => leerJson(response, 'No se pudieron buscar libros.'))
        .then((result) => { if (vigente) { setLibrosDisponibles(Array.isArray(result) ? result : []); setErrorBusquedaLibro(''); } })
        .catch((error) => { if (vigente && error.name !== 'AbortError') setErrorBusquedaLibro(error.message || 'No se pudieron buscar libros.'); });
    }, 250);
    return () => { vigente = false; window.clearTimeout(timer); controller.abort(); };
  }, [busquedaLibro, reporte, libroSeleccionado]);

  useEffect(() => {
    const controller = new AbortController();
    let vigente = true;
    const id = ++consultaId.current;
    setError(null);
    setDatos(null);
    if (validationError) { setCargando(false); return () => controller.abort(); }
    setCargando(true);
    const params = {};
    reporte.filtros.forEach((key) => { if (filtros[key]) params[key] = filtros[key]; });
    if (reporte.limite) { params.limit = limit; params.offset = offset; }
    consultarReporte(tipo, params, { signal: controller.signal })
      .then((response) => leerJson(response, 'No se pudo consultar el reporte.'))
      .then((result) => { if (vigente && id === consultaId.current) setDatos(result); })
      .catch((err) => { if (vigente && id === consultaId.current && err.name !== 'AbortError') setError({ message: err.message || 'Error de conexión al consultar.', status: err.status, details: err.details }); })
      .finally(() => { if (vigente && id === consultaId.current) setCargando(false); });
    return () => { vigente = false; controller.abort(); };
  }, [tipo, reporte, filtros, limit, offset, validationError, version]);

  useEffect(() => () => exportAbort.current?.abort(), []);

  const cambiarTipo = (nuevoTipo) => {
    if (!REPORTES.some((item) => item.id === nuevoTipo)) return;
    exportAbort.current?.abort();
    setFormatoExportando('');
    const siguiente = REPORTES.find((item) => item.id === nuevoTipo);
    setTipo(nuevoTipo);
    setLimit(siguiente.limite || 50);
    setPagina(1);
    setErrorExportacion(null);
  };
  const cambiarFiltro = (key, value) => {
    setFiltros((actual) => ({ ...actual, [key]: value }));
    if (key === 'libroId' && !value) setLibroSeleccionado(null);
    setPagina(1); setErrorExportacion(null);
  };
  const seleccionarLibro = (id) => {
    setLibroSeleccionado(librosDisponibles.find((libro) => libro.id === id) || null);
    cambiarFiltro('libroId', id);
    setBusquedaLibro('');
  };

  const exportar = useCallback(async (formato) => {
    if (exportLock.current || formatoExportando || validationError) return;
    exportLock.current = true;
    const controller = new AbortController();
    exportAbort.current = controller;
    setFormatoExportando(formato);
    setErrorExportacion(null);
    const params = {};
    reporte.filtros.forEach((key) => { if (filtros[key]) params[key] = filtros[key]; });
    try {
      const response = await descargarReporte(tipo, params, formato, { signal: controller.signal });
      if (!response.ok) await leerJson(response, 'No se pudo generar la exportación.');
      const blob = await response.blob();
      if (!blob.size) throw new Error('El archivo descargado está vacío.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreDescarga(response.headers.get('Content-Disposition'), tipo, formato);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (err.name !== 'AbortError') setErrorExportacion({ message: err.message || 'Error al descargar el archivo.', status: err.status, details: err.details, formato });
    } finally {
      exportLock.current = false;
      if (exportAbort.current === controller) {
        exportAbort.current = null;
        setFormatoExportando('');
      }
    }
  }, [formatoExportando, validationError, reporte, filtros, tipo]);

  const ultimaPagina = datos?.total ? Math.max(1, Math.ceil(datos.total / limit)) : 1;
  useEffect(() => { if (pagina > ultimaPagina) setPagina(ultimaPagina); }, [pagina, ultimaPagina]);

  return {
    tipo, reporte, cambiarTipo, filtros, cambiarFiltro, datos, cargando, error, validationError,
    limit, pagina, total: Number(datos?.total || 0), offset, cambiarPagina: setPagina,
    cambiarLimit: (value) => { setLimit(value); setPagina(1); }, recargar: () => setVersion((actual) => actual + 1),
    exportar, formatoExportando, errorExportacion, categorias, bodegas, sucursales, vendedores, catalogosError,
    busquedaLibro, setBusquedaLibro, librosDisponibles, libroSeleccionado, seleccionarLibro, errorBusquedaLibro,
  };
}

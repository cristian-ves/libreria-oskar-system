import { useState, useEffect, useCallback, useRef } from 'react';
import { getResumenInventario, getExistencias } from '../../../services/api/inventario.api';
import { getBodegas } from '../../../services/api/bodegas.api';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

export default function useInventarioData(activeTab) {
  // ── Datos Maestros & Resumen ──────────────────────────────────────────────
  const [bodegas, setBodegas] = useState([]);
  const [resumen, setResumen] = useState({
    total_unidades: 0,
    titulos_con_stock: 0,
    bajo_stock: 0,
    agotados: 0,
    obsoletos: 0,
    libros_sin_precio: 0,
    alertas_bajo_stock: [],
  });
  const [loadingResumen, setLoadingResumen] = useState(true);

  // ── Pestaña Existencias ───────────────────────────────────────────────────
  const [existencias, setExistencias] = useState([]);
  const [totalExistencias, setTotalExistencias] = useState(0);
  const [loadingExistencias, setLoadingExistencias] = useState(true);
  const [existenciasLimit, setExistenciasLimit] = useState(20);
  const [existenciasOffset, setExistenciasOffset] = useState(0);
  const existenciasController = useRef(null);
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [searchInput, setSearchInput] = useState('');
  const debouncedQ = useDebouncedValue(searchInput, 300);
  const [selectedBodega, setSelectedBodega] = useState('');

  // ── Cargar Resumen y Bodegas ──────────────────────────────────────────────
  const cargarResumen = useCallback(async () => {
    try {
      setLoadingResumen(true);
      const res = await getResumenInventario();
      if (res.ok) {
        const json = await res.json();
        setResumen(json.data || {});
      }
    } catch (err) {
      console.error('[RESUMEN ERROR]:', err);
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  const cargarBodegas = useCallback(async () => {
    try {
      const res = await getBodegas();
      if (res.ok) {
        const json = await res.json();
        setBodegas(json.data || []);
      }
    } catch (err) {
      console.error('[BODEGAS ERROR]:', err);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    cargarBodegas();
  }, [cargarResumen, cargarBodegas]);

  // ── Cargar Existencias ────────────────────────────────────────────────────
  const cargarExistencias = useCallback(async () => {
    existenciasController.current?.abort();
    const controller = new AbortController();
    existenciasController.current = controller;
    try {
      setLoadingExistencias(true);
      const params = new URLSearchParams();
      params.set('limit', String(existenciasLimit));
      params.set('offset', String(existenciasOffset));
      if (estadoFilter && estadoFilter !== 'todos') {
        params.set('estado', estadoFilter);
      }
      if (debouncedQ.trim()) {
        params.set('q', debouncedQ.trim());
      }
      if (selectedBodega) {
        params.set('bodegaId', selectedBodega);
      }

      const res = await getExistencias(params, { signal: controller.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'No se pudieron cargar las existencias.');
      if (!controller.signal.aborted) {
        const uniqueItems = [...new Map((json.data || []).map((item) => [item.inventario_id, item])).values()];
        const nextTotal = Number(json.total ?? uniqueItems.length) || 0;
        const nextLimit = Number(json.limit) || existenciasLimit;
        setExistencias(uniqueItems);
        setTotalExistencias(nextTotal);
        setExistenciasLimit(nextLimit);
        const lastOffset = nextTotal === 0 ? 0 : Math.floor((nextTotal - 1) / nextLimit) * nextLimit;
        if (existenciasOffset > lastOffset) setExistenciasOffset(lastOffset);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('[EXISTENCIAS ERROR]:', err);
        setExistencias([]);
        setTotalExistencias(0);
      }
    } finally {
      if (existenciasController.current === controller && !controller.signal.aborted) {
        setLoadingExistencias(false);
      }
    }
  }, [estadoFilter, debouncedQ, selectedBodega, existenciasLimit, existenciasOffset]);

  useEffect(() => {
    if (searchInput.trim() !== debouncedQ.trim()) {
      existenciasController.current?.abort();
      setLoadingExistencias(true);
      return () => existenciasController.current?.abort();
    }
    if (activeTab === 'existencias') {
      cargarExistencias();
    }
    return () => existenciasController.current?.abort();
  }, [activeTab, cargarExistencias, searchInput, debouncedQ]);

  const cambiarFiltro = (setter) => (value) => {
    setter(value);
    setExistenciasOffset(0);
  };

  const cambiarTamanoPagina = (value) => {
    setExistenciasLimit(value);
    setExistenciasOffset(0);
  };

  return {
    bodegas,
    resumen,
    loadingResumen,
    existencias,
    totalExistencias,
    loadingExistencias,
    existenciasLimit,
    existenciasOffset,
    paginaExistencias: totalExistencias === 0 ? 0 : Math.floor(existenciasOffset / existenciasLimit) + 1,
    totalPaginasExistencias: Math.ceil(totalExistencias / existenciasLimit),
    setPaginaExistencias: (pagina) => setExistenciasOffset((Math.max(1, pagina) - 1) * existenciasLimit),
    setTamanoPaginaExistencias: cambiarTamanoPagina,
    estadoFilter,
    setEstadoFilter: cambiarFiltro(setEstadoFilter),
    searchInput,
    setSearchInput: cambiarFiltro(setSearchInput),
    selectedBodega,
    setSelectedBodega: cambiarFiltro(setSelectedBodega),
    cargarResumen,
    cargarExistencias,
  };
}

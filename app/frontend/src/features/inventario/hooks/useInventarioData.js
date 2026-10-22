import { useState, useEffect, useCallback } from 'react';
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
  const [loadingExistencias, setLoadingExistencias] = useState(true);
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
    try {
      setLoadingExistencias(true);
      const params = new URLSearchParams();
      if (estadoFilter && estadoFilter !== 'todos') {
        params.set('estado', estadoFilter);
      }
      if (debouncedQ.trim()) {
        params.set('q', debouncedQ.trim());
      }
      if (selectedBodega) {
        params.set('bodegaId', selectedBodega);
      }

      const res = await getExistencias(params);
      if (res.ok) {
        const json = await res.json();
        setExistencias(json.data || []);
      } else {
        setExistencias([]);
      }
    } catch (err) {
      console.error('[EXISTENCIAS ERROR]:', err);
      setExistencias([]);
    } finally {
      setLoadingExistencias(false);
    }
  }, [estadoFilter, debouncedQ, selectedBodega]);

  useEffect(() => {
    if (activeTab === 'existencias') {
      cargarExistencias();
    }
  }, [activeTab, cargarExistencias]);

  return {
    bodegas,
    resumen,
    loadingResumen,
    existencias,
    loadingExistencias,
    estadoFilter,
    setEstadoFilter,
    searchInput,
    setSearchInput,
    selectedBodega,
    setSelectedBodega,
    cargarResumen,
    cargarExistencias,
  };
}

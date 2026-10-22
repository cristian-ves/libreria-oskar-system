import { useState, useEffect, useCallback } from 'react';
import { getMovimientos } from '../../../services/api/inventario.api';

export const KARDEX_LIMIT = 25;

export default function useKardex(activeTab) {
  const [movimientos, setMovimientos] = useState([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [kardexTipo, setKardexTipo] = useState('');
  const [kardexBodega, setKardexBodega] = useState('');
  const [kardexLibroId, setKardexLibroId] = useState(null);
  const [kardexLibroTitulo, setKardexLibroTitulo] = useState('');
  const [kardexOffset, setKardexOffset] = useState(0);

  // ── Cargar Kardex ─────────────────────────────────────────────────────────
  const cargarKardex = useCallback(async () => {
    try {
      setLoadingKardex(true);
      const params = new URLSearchParams();
      params.set('limit', String(KARDEX_LIMIT));
      params.set('offset', String(kardexOffset));

      if (kardexTipo) params.set('tipo', kardexTipo);
      if (kardexBodega) params.set('bodegaId', kardexBodega);
      if (kardexLibroId) params.set('libroId', kardexLibroId);

      const res = await getMovimientos(params);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setMovimientos(data.movimientos || []);
        setTotalMovimientos(data.total || 0);
      } else {
        setMovimientos([]);
        setTotalMovimientos(0);
      }
    } catch (err) {
      console.error('[KARDEX ERROR]:', err);
      setMovimientos([]);
      setTotalMovimientos(0);
    } finally {
      setLoadingKardex(false);
    }
  }, [kardexOffset, kardexTipo, kardexBodega, kardexLibroId]);

  useEffect(() => {
    if (activeTab === 'kardex') {
      cargarKardex();
    }
  }, [activeTab, cargarKardex]);

  const filtrarPorLibro = (libroId, titulo) => {
    setKardexLibroId(libroId);
    setKardexLibroTitulo(titulo);
    setKardexOffset(0);
  };

  const limpiarFiltroLibroKardex = () => {
    setKardexLibroId(null);
    setKardexLibroTitulo('');
    setKardexOffset(0);
  };

  return {
    movimientos,
    totalMovimientos,
    loadingKardex,
    kardexTipo,
    setKardexTipo,
    kardexBodega,
    setKardexBodega,
    kardexLibroId,
    kardexLibroTitulo,
    kardexOffset,
    setKardexOffset,
    filtrarPorLibro,
    limpiarFiltroLibroKardex,
  };
}

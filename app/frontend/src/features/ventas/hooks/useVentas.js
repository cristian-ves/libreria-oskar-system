import { useState, useEffect, useCallback } from 'react';
import { getVentas } from '../../../services/api/ventas.api';

export const VENTAS_LIMIT = 25;

export default function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [offset, setOffset] = useState(0);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const cargar = useCallback(async () => {
    if (rangoInvalido) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', String(VENTAS_LIMIT));
      params.set('offset', String(offset));
      if (estado) params.set('estado', estado);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);

      const res = await getVentas(params);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'No se pudieron cargar las ventas.');
      setVentas(json.data?.ventas || []);
      setTotal(json.data?.total || 0);
    } catch (err) {
      setVentas([]);
      setTotal(0);
      setError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  }, [offset, estado, desde, hasta, rangoInvalido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cambiar un filtro reinicia la paginación.
  const cambiarFiltro = (setter) => (valor) => {
    setter(valor);
    setOffset(0);
  };

  return {
    ventas, total, loading, error, rangoInvalido, cargar,
    estado, setEstado: cambiarFiltro(setEstado),
    desde, setDesde: cambiarFiltro(setDesde),
    hasta, setHasta: cambiarFiltro(setHasta),
    offset, setOffset,
  };
}

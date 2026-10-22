import { useState, useEffect, useCallback } from 'react';
import { getVenta } from '../../../services/api/ventas.api';

export default function useVentaDetalle(id) {
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoEncontrada(false);
      const res = await getVenta(id);
      const json = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setNoEncontrada(true);
        setVenta(null);
      } else if (!res.ok) {
        throw new Error(json.message || 'No se pudo cargar la venta.');
      } else {
        setVenta(json.data);
      }
    } catch (err) {
      setError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { venta, loading, noEncontrada, error, recargar: cargar };
}

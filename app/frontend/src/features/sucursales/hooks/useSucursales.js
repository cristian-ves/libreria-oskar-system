import { useCallback, useEffect, useState } from 'react';
import { getSucursales } from '../../../services/api/sucursales.api';

async function leer(response, fallback) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.status !== 'success') {
    const error = new Error(json.message || fallback);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json.data;
}

export default function useSucursales({ estado, busqueda }) {
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const data = await leer(await getSucursales({ activo: estado, q: busqueda }), 'No se pudieron cargar las sucursales.');
      setSucursales(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'AbortError') setError({ message: err.message, status: err.status, details: err.details });
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [estado, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);
  return { sucursales, cargando, error, cargar };
}

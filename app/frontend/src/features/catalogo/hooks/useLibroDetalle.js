import { useState, useEffect } from 'react';
import { getLibroDetalle } from '../../../services/api/catalogo.api';

export default function useLibroDetalle(ref, navigate) {
  const [libro, setLibro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reintentar = () => {
    setReloadCounter((c) => c + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    async function cargarDetalle() {
      try {
        const res = await getLibroDetalle(ref);
        if (cancelled) return;

        if (res.status === 404) {
          setIsNotFound(true);
          return;
        }

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || `Error al obtener el libro (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (cancelled) return;

        const data = json.data;
        if (data) {
          setLibro(data);

          if (data.ref && data.ref !== ref) {
            navigate(`/catalogo/${data.ref}`, { replace: true });
          }
        } else {
          setIsNotFound(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error de conexión.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      cancelled = true;
    };
  }, [ref, reloadCounter, navigate]);

  useEffect(() => {
    const prevTitle = document.title;
    if (libro?.titulo) {
      document.title = `${libro.titulo} — Librería Oskar`;
    }
    return () => {
      document.title = prevTitle;
    };
  }, [libro?.titulo]);

  return { libro, loading, isNotFound, error, reintentar };
}

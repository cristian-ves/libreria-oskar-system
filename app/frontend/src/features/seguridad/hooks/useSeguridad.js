import { useState, useEffect, useCallback } from 'react';
import { getEstadoDosFactores, regenerarCodigosRespaldo } from '../../../services/api/dosFactores.api';
import { clasificarErrorCodigo } from '../errores';

const PISTA_CODIGO_USADO = 'Si acabas de iniciar sesión con ese mismo código, espera al siguiente (hasta 30 segundos).';

export default function useSeguridad() {
  const [estado, setEstado] = useState(null); // { activo, obligatorio, codigosRespaldoRestantes }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerando, setRegenerando] = useState(false);
  const [errorRegenerar, setErrorRegenerar] = useState(null);
  const [estadoRegenerar, setEstadoRegenerar] = useState(null); // 'invalido' | 'bloqueado' | null
  const [codigosNuevos, setCodigosNuevos] = useState(null); // solo en memoria, se muestran una vez

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEstadoDosFactores();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'No se pudo cargar el estado de la verificación.');
      setEstado(json.data);
    } catch (err) {
      setError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Devuelve true si se generaron códigos nuevos. 400 = código inválido (no 401, a propósito). */
  const regenerar = async (codigo) => {
    if (regenerando) return false;
    setRegenerando(true);
    setErrorRegenerar(null);
    try {
      const res = await regenerarCodigosRespaldo(codigo);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(json.details) ? [...json.details] : [];
        if (res.status === 400) details.push(PISTA_CODIGO_USADO);
        setErrorRegenerar({ message: json.message || 'No se pudieron generar los códigos.', details });
        const tipo = clasificarErrorCodigo('regenerar', res.status, json.message);
        setEstadoRegenerar(tipo === 'invalido' || tipo === 'bloqueado' ? tipo : null);
        return false;
      }
      setCodigosNuevos(json.data.codigosRespaldo);
      return true;
    } catch {
      setErrorRegenerar({ message: 'Error de conexión con el servidor.' });
      return false;
    } finally {
      setRegenerando(false);
    }
  };

  // "Intentar de nuevo" tras un código inválido (el bloqueo no tiene reintento)
  const reintentarRegenerar = () => {
    setErrorRegenerar(null);
    setEstadoRegenerar(null);
  };

  // Descarta los códigos del estado y refresca el conteo
  const cerrarCodigos = () => {
    setCodigosNuevos(null);
    cargar();
  };

  return {
    estado, loading, error, recargar: cargar, regenerando, errorRegenerar, estadoRegenerar,
    codigosNuevos, regenerar, reintentarRegenerar, cerrarCodigos,
  };
}

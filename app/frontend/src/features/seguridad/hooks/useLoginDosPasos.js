import { useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  configurarDosFactores,
  activarDosFactores,
  verificarDosFactores,
} from '../../../services/api/dosFactores.api';
import { clasificarErrorCodigo } from '../errores';

const AVISO_VENCIDO = 'La verificación venció. Inicia sesión de nuevo.';
const ERROR_CONEXION = 'Error de conexión con el servidor.';

/**
 * Flujo del login con 2FA. Pasos:
 *   credenciales → verificar → sesión
 *   credenciales → configurar → respaldo → sesión (solo al pulsar Continuar)
 * El token temporal vive solo en este estado (nunca en almacenamiento, URL ni consola).
 */
export default function useLoginDosPasos() {
  const { login, establecerSesion } = useAuth();
  const [paso, setPaso] = useState('credenciales');
  const [temporal, setTemporal] = useState(null); // { token, venceEn }
  const [alta, setAlta] = useState(null); // { qrDataUrl, secretoManual, otpauthUrl }
  const [sesionPendiente, setSesionPendiente] = useState(null); // { token, usuario, codigosRespaldo }
  const [error, setError] = useState(null);
  const [requiereReinicio, setRequiereReinicio] = useState(false);
  const [estadoCodigo, setEstadoCodigo] = useState(null); // 'invalido' | 'bloqueado' | null
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Token temporal para el que ya se pidió /configurar (ver cargarAlta)
  const configurarPedido = useRef(null);

  const volver = (mensaje = '') => {
    setPaso('credenciales');
    setTemporal(null);
    setAlta(null);
    setSesionPendiente(null);
    setError(null);
    setRequiereReinicio(false);
    setEstadoCodigo(null);
    setAviso(mensaje);
    configurarPedido.current = null;
  };

  const fallar = (res, json, porDefecto, contexto) => {
    const tipo = clasificarErrorCodigo(contexto, res.status, json.message);
    setError({ message: json.message || porDefecto });
    // Token vencido o 2FA restablecido (otro 401), o bloqueo (429): solo queda volver a credenciales
    setRequiereReinicio(tipo === 'sesionTerminada' || tipo === 'bloqueado');
    setEstadoCodigo(tipo === 'invalido' || tipo === 'bloqueado' ? tipo : null);
  };

  // "Intentar de nuevo" o cambio app/respaldo. No toca alta ni configurarPedido: el QR sigue igual.
  const limpiarError = () => {
    setError(null);
    setEstadoCodigo(null);
  };

  // Cada /configurar genera un secreto NUEVO y descarta el anterior. Se llama desde el
  // submit de credenciales (no en un useEffect, que StrictMode ejecutaría dos veces) y la
  // guardia impide una segunda llamada para el mismo token: el QR mostrado siempre
  // corresponde al secreto que el backend validará en /activar.
  const cargarAlta = async (tokenTemporal) => {
    if (configurarPedido.current === tokenTemporal) return;
    configurarPedido.current = tokenTemporal;
    const res = await configurarDosFactores(tokenTemporal);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError({ message: json.message || 'No se pudo preparar la configuración.' });
      setRequiereReinicio(true);
      return;
    }
    setAlta(json.data);
  };

  // Ejecuta una llamada con token temporal; si ya venció, vuelve a credenciales sin llamar
  const conTemporal = async (accion) => {
    if (!temporal || Date.now() > temporal.venceEn) {
      volver(AVISO_VENCIDO);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await accion(temporal.token);
    } catch {
      setError({ message: ERROR_CONEXION });
    } finally {
      setEnviando(false);
    }
  };

  const enviarCredenciales = async (email, password) => {
    setEnviando(true);
    setError(null);
    setAviso('');
    try {
      const resultado = await login(email, password);
      if (resultado.paso === 'sesion') return; // Login redirige al fijarse user
      const token = resultado.tokenTemporal;
      setTemporal({ token, venceEn: Date.now() + resultado.expiraEnSegundos * 1000 });
      setPaso(resultado.paso);
      if (resultado.paso === 'configurar') await cargarAlta(token);
    } catch (err) {
      setError({ message: err.message || 'Error al iniciar sesión.' });
    } finally {
      setEnviando(false);
    }
  };

  const verificar = (cuerpo) =>
    conTemporal(async (token) => {
      const res = await verificarDosFactores(token, cuerpo);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return fallar(res, json, 'No se pudo verificar el código.', 'verificar');
      establecerSesion(json.data);
    });

  // Tras activar NO se abre la sesión: Login redirigiría y los códigos se perderían.
  const activar = (codigo) =>
    conTemporal(async (token) => {
      const res = await activarDosFactores(token, codigo);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return fallar(res, json, 'No se pudo activar la verificación.', 'activar');
      setSesionPendiente(json.data);
      setAlta(null);
      setTemporal(null);
      setPaso('respaldo');
    });

  // Solo tras "Ya los guardé" + Continuar: descarta los códigos y abre la sesión
  const continuar = () => {
    if (!sesionPendiente) return;
    const { token, usuario } = sesionPendiente;
    setSesionPendiente(null);
    establecerSesion({ token, usuario });
  };

  return {
    paso,
    alta,
    sesionPendiente,
    error,
    aviso,
    enviando,
    requiereReinicio,
    estadoCodigo,
    limpiarError,
    enviarCredenciales,
    verificar,
    activar,
    continuar,
    volver: () => volver(),
  };
}

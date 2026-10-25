import { useEffect, useRef, useState } from 'react';
import { solicitarRecuperacion } from '../../../services/api/recuperacion.api';

const ERROR_CONEXION = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
const ERROR_GENERICO = 'No se pudo procesar la solicitud. Inténtalo de nuevo.';

/** Pantalla "olvidé mi contraseña": formulario → enviando → enviado. Sin pistas sobre si el correo existe. */
export default function useSolicitarRecuperacion() {
  const [estado, setEstado] = useState('formulario');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(null);
  const refCampo = useRef(null);
  const refConfirmacion = useRef(null);

  // Foco explícito: al campo en el formulario y a la confirmación al enviarse
  useEffect(() => {
    if (estado === 'formulario') refCampo.current?.focus();
    else if (estado === 'enviado') refConfirmacion.current?.focus();
  }, [estado]);

  const enviar = async () => {
    if (estado === 'enviando') return;
    setEstado('enviando');
    setError(null);
    try {
      const r = await solicitarRecuperacion(email.trim());
      if (r.ok) {
        setMensaje(r.data?.mensaje || '');
        setEstado('enviado');
      } else {
        setError({ message: r.message || ERROR_GENERICO, details: r.details });
        setEstado('formulario');
      }
    } catch {
      setError({ message: ERROR_CONEXION });
      setEstado('formulario');
    }
  };

  const usarOtroCorreo = () => {
    setEmail('');
    setMensaje('');
    setError(null);
    setEstado('formulario');
  };

  return { estado, email, setEmail, mensaje, error, enviar, usarOtroCorreo, refCampo, refConfirmacion };
}

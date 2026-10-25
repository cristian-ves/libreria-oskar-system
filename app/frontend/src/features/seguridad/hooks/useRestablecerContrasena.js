import { useEffect, useRef, useState } from 'react';
import { restablecerContrasena } from '../../../services/api/recuperacion.api';
import { clasificarErrorRestablecer, extraerTokenDelHash, validarPasswordNueva } from '../recuperacion';

const ERROR_CONEXION = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
const ERROR_GENERICO = 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';

/**
 * Pantalla del enlace del correo: formulario | enviando | exito | enlaceInvalido.
 * El token y las contraseñas viven solo en memoria.
 */
export default function useRestablecerContrasena() {
  // El token se lee UNA vez, en el inicializador (durante el render, antes de cualquier efecto):
  // la doble ejecución de efectos de StrictMode no puede perderlo.
  const [token, setToken] = useState(() => extraerTokenDelHash(window.location.hash));
  const [estado, setEstado] = useState(() => (token ? 'formulario' : 'enlaceInvalido'));
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState(null);
  const refCampo = useRef(null);
  const refTitulo = useRef(null);

  // Quita el fragmento de la URL (idempotente): no lee ni asigna el token, así que repetirlo es inocuo.
  // Conserva history.state de react-router y no navega.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Foco explícito: al primer campo en el formulario y al título en exito / enlaceInvalido
  useEffect(() => {
    if (estado === 'formulario') refCampo.current?.focus();
    else if (estado !== 'enviando') refTitulo.current?.focus();
  }, [estado]);

  const enviar = async () => {
    if (estado === 'enviando' || !token) return;
    const invalida = validarPasswordNueva(password, confirmacion);
    if (invalida) {
      setError({ message: invalida });
      refCampo.current?.focus();
      return;
    }
    setError(null);
    setEstado('enviando');
    try {
      const r = await restablecerContrasena(token, password);
      if (r.ok) {
        setPassword('');
        setConfirmacion('');
        setToken(null);
        setEstado('exito');
        return;
      }
      const tipo = clasificarErrorRestablecer(r.status, r.message);
      if (tipo === 'enlaceInvalido') {
        setPassword('');
        setConfirmacion('');
        setToken(null);
        setEstado('enlaceInvalido');
        return;
      }
      if (tipo === 'password') {
        setPassword('');
        setConfirmacion('');
      }
      // 'limite' y 'otro': el formulario sigue usable (recargar perdería el token), sin temporizadores
      setError({ message: r.message || ERROR_GENERICO, details: r.details });
    } catch {
      setError({ message: ERROR_CONEXION });
    }
    setEstado('formulario');
  };

  return {
    estado, error, password, setPassword, confirmacion, setConfirmacion,
    mostrar, setMostrar, enviar, refCampo, refTitulo,
  };
}

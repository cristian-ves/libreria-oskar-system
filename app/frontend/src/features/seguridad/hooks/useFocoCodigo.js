import { useEffect, useRef } from 'react';

/**
 * Foco tras un error de código (estadoCodigo: 'invalido' | 'bloqueado' | null). El campo queda
 * deshabilitado, así que el foco pasa a `refFoco` (el botón "Intentar de nuevo" o la alerta del
 * bloqueo). `reintentar(limpiar)` limpia y, ya habilitado el campo, le devuelve el foco.
 * Se busca el campo por id porque Input no reenvía refs.
 */
export default function useFocoCodigo(estadoCodigo, idCampo) {
  const refFoco = useRef(null);
  const volverAlCampo = useRef(false);

  useEffect(() => {
    if (estadoCodigo) {
      refFoco.current?.focus();
    } else if (volverAlCampo.current) {
      volverAlCampo.current = false;
      document.getElementById(idCampo)?.focus();
    }
  }, [estadoCodigo, idCampo]);

  const reintentar = (limpiar) => {
    volverAlCampo.current = true;
    limpiar();
  };

  return { refFoco, reintentar };
}

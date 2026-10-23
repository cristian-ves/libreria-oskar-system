export const describeCameraError = (err) => {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'La cámara solo funciona con HTTPS o en localhost. Ingresa el ISBN manualmente.';
  }
  const text = `${err?.name || ''} ${err?.message || ''} ${String(err)}`;
  if (/NotAllowedError|PermissionDeniedError|Permission denied/i.test(text)) {
    return 'Permiso de cámara denegado. Habilítalo en tu navegador o ingresa el ISBN manualmente.';
  }
  if (/NotFoundError|DevicesNotFoundError|Requested device not found/i.test(text)) {
    return 'No se encontró ninguna cámara en este dispositivo.';
  }
  if (/NotReadableError|TrackStartError|Could not start video source/i.test(text)) {
    return 'La cámara está en uso por otra aplicación o pestaña. Ciérrala e inténtalo de nuevo.';
  }
  return 'No se pudo iniciar la cámara. Reintenta o ingresa el ISBN manualmente.';
};

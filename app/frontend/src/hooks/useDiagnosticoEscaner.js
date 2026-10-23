import { useEffect, useState } from 'react';

// Diagnóstico solo en desarrollo (no llega al build): se actualiza cada segundo.
export function useDiagnosticoEscaner({ readerRef, frameRef, lastReadRef, failCountRef, motorRef, qrboxRef }) {
  const [diag, setDiag] = useState('');
  const [showDiag, setShowDiag] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV || !showDiag) return undefined;
    const timer = setInterval(() => {
      const video = readerRef.current?.querySelector('video');
      const frame = frameRef.current;
      const last = lastReadRef.current;
      const qrbox = qrboxRef.current;
      setDiag([
        `Diag escáner · video ${video ? `${video.videoWidth}x${video.videoHeight}` : '-'}`,
        `en pantalla ${video ? `${video.clientWidth}x${video.clientHeight}` : '-'} (lógico)`,
        `marco ${frame ? `${frame.clientWidth}x${frame.clientHeight}` : '-'}`,
        `recuadro ${qrbox ? `${qrbox.width}x${qrbox.height}` : '-'}`,
        `BarcodeDetector: ${'BarcodeDetector' in window ? 'sí' : 'no'}`,
        `motor: ${motorRef.current || '-'}`,
        last.text ? `última lectura ${last.text} (hace ${Math.round((Date.now() - last.at) / 1000)} s)` : `sin lectura, ${failCountRef.current} cuadros sin código`,
      ].join(' · '));
    }, 1000);
    return () => clearInterval(timer);
  }, [showDiag]);

  return { diag, showDiag, alternarDiag: () => setShowDiag((v) => !v) };
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, RefreshCw, Keyboard, Check, ShieldAlert } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, isProcessing, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef(null);
  const readerElementId = 'reader-container';

  // Detener el escáner y liberar la cámara
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('[SCANNER CLEANUP]:', err);
      } finally {
        setIsCameraActive(false);
      }
    }
  }, []);

  // Iniciar el escáner con la cámara seleccionada
  const startScanner = useCallback(async (cameraId) => {
    try {
      setCameraError(null);
      await stopScanner();

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.777778,
      };

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText) => {
          // Si ya se está procesando una consulta HTTP, ignorar lecturas duplicadas
          if (isProcessing) return;
          console.log('[BARCODE DETECTED]:', decodedText);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Errores menores de cuadro (ruido) se ignoran en silencio
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.error('[CAMERA START ERROR]:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Verifica que hayas concedido los permisos en tu navegador o ingresa el ISBN manualmente.'
      );
      setIsCameraActive(false);
    }
  }, [isProcessing, onScanSuccess, stopScanner]);

  // Enumerar dispositivos de cámara disponibles
  useEffect(() => {
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')
          );
          const initialId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(initialId);
          startScanner(initialId);
        } else {
          setCameraError('No se detectaron cámaras en este dispositivo.');
          setShowManualInput(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[CAMERAS ENUMERATION ERROR]:', err);
        setCameraError('Permiso de cámara denegado o no disponible en este entorno.');
        setShowManualInput(true);
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualIsbn.trim() && !isProcessing) {
      onScanSuccess(manualIsbn.trim());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white text-sm sm:text-base">
            Escáner de Código de Barras / ISBN
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-slate-300 hover:text-emerald-400 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{showManualInput ? 'Ocultar teclado' : 'Entrada manual'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cerrar visor
            </button>
          )}
        </div>
      </div>

      {/* Selector de cámara cuando hay múltiples */}
      {cameras.length > 1 && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <label className="text-slate-400 font-medium whitespace-nowrap">Dispositivo:</label>
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Cámara ${c.id.substring(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visor de Cámara y Video Stream */}
      <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center border-2 border-slate-800 shadow-inner">
        <div id={readerElementId} className="w-full h-full" />

        {/* Guía visual y línea de escaneo superpuesta */}
        {isCameraActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Recuadro de enfoque */}
            <div className="w-64 h-36 border-2 border-emerald-400/70 rounded-lg relative overflow-hidden shadow-[0_0_25px_rgba(34,197,94,0.25)]">
              {/* Línea láser de escaneo animada */}
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#22c55e] animate-scan-line" />
            </div>
            <p className="mt-3 text-[11px] font-mono text-emerald-300 bg-black/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Apunta al código de barras o ISBN
            </p>
          </div>
        )}

        {/* Mensaje de error de cámara o permisos */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 p-5 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs text-amber-200 mb-3 max-w-xs">{cameraError}</p>
            <button
              onClick={() => startScanner(selectedCameraId)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar acceso a cámara
            </button>
          </div>
        )}
      </div>

      {/* Fallback de entrada manual siempre disponible */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Ingreso manual de código ISBN (ej. 9780132350884):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe el ISBN de 10 o 13 dígitos..."
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="submit"
              disabled={!manualIsbn.trim() || isProcessing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Ingresar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

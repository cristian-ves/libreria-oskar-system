import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, Keyboard, Check, ShieldAlert } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, isProcessing, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef(null);
  const readerElementId = 'reader-container';

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
          if (isProcessing) return;
          console.log('[BARCODE DETECTED]:', decodedText);
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignorar cuadros sin código
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#e19922]" />
          <h3 className="font-bold text-[#252525] text-sm sm:text-base">
            Escáner de Código de Barras / ISBN
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-gray-700 hover:text-[#252525] bg-[#f3f3f3] hover:bg-gray-200 px-2.5 py-1.5 rounded-xl border border-gray-200 flex items-center gap-1.5 transition-colors font-semibold"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{showManualInput ? 'Ocultar teclado' : 'Entrada manual'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-[#252525] bg-[#f3f3f3] px-2 py-1.5 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cerrar visor
            </button>
          )}
        </div>
      </div>

      {cameras.length > 1 && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <label className="text-gray-500 font-bold whitespace-nowrap">Dispositivo:</label>
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] rounded-xl px-2.5 py-1.5 text-xs focus:border-[#b07c19] outline-none font-medium"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Cámara ${c.id.substring(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visor de Cámara */}
      <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center border-2 border-gray-300 shadow-inner">
        <div id={readerElementId} className="w-full h-full" />

        {isCameraActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-64 h-36 border-2 border-[#e8c85e] rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(232,200,94,0.4)]">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#e8c85e] to-transparent shadow-[0_0_8px_#e8c85e] animate-scan-line" />
            </div>
            <p className="mt-3 text-[11px] font-mono font-bold text-[#252525] bg-[#e8c85e] px-2.5 py-0.5 rounded-md shadow-xs">
              Apunta al código de barras o ISBN
            </p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-white/95 p-5 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-xs text-gray-700 font-medium mb-3 max-w-xs">{cameraError}</p>
            <button
              onClick={() => startScanner(selectedCameraId)}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar acceso a cámara
            </button>
          </div>
        )}
      </div>

      {/* Entrada manual */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="mt-4 p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
          <label className="block text-xs font-bold text-[#252525] mb-1.5">
            Ingreso manual de código ISBN (ej. 9780132350884):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe el ISBN de 10 o 13 dígitos..."
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              className="flex-1 bg-white border border-gray-200 text-[#252525] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#b07c19] font-mono font-bold"
            />
            <button
              type="submit"
              disabled={!manualIsbn.trim() || isProcessing}
              className="bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 text-[#252525] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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

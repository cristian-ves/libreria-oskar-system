import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, Keyboard, Check, ShieldAlert } from 'lucide-react';
import { cargarDetectorDeCodigos } from '../utils/cargarDetectorDeCodigos';
import EstadoEscaner from './EstadoEscaner';

const READER_ELEMENT_ID = 'reader-container';
const AYUDA_TRAS_MS = 8000;
const REPEAT_COOLDOWN_MS = 3000;

// Solo códigos 1D de libros/retail; se excluye UPC_EAN_EXTENSION (precio de 5 dígitos).
const SCANNER_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

// La librería dimensiona el <video> con el ancho de #reader-container y recorta el
// análisis al tamaño EN PANTALLA del recuadro (canvas = qrbox). Por eso el contenedor
// se maqueta con un ancho lógico fijo y se reduce con transform: scale(), de modo que
// el recorte analizado sea grande aunque el visor se vea pequeño.
const LAYOUT_WIDTH = 800;
const DEFAULT_VIDEO_RATIO = 9 / 16;
// Alto visible máximo (4:3). Un video vertical más alto se recorta por arriba y abajo,
// y el recuadro se calcula para caber dentro de esa parte visible.
const MAX_VISIBLE_RATIO = 0.75;
const FRAME_BORDER_PX = 4;

let lastQrbox = null;

// Zona de escaneo ancha y baja para códigos 1D. Recibe el tamaño del VIDEO, no del marco.
const getQrbox = (viewfinderWidth, viewfinderHeight) => {
  const visibleHeight = Math.min(viewfinderHeight, Math.floor(viewfinderWidth * MAX_VISIBLE_RATIO));
  lastQrbox = {
    width: Math.min(viewfinderWidth, Math.max(50, Math.floor(viewfinderWidth * 0.9))),
    height: Math.min(visibleHeight, Math.max(50, Math.floor(Math.min(visibleHeight * 0.45, viewfinderWidth * 0.3)))),
  };
  return lastQrbox;
};

const describeCameraError = (err) => {
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

export default function BarcodeScanner({ onScanSuccess, isProcessing, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const [geometry, setGeometry] = useState({ scale: 0.5, videoHeight: Math.round(LAYOUT_WIDTH * DEFAULT_VIDEO_RATIO) });
  const [diag, setDiag] = useState('');
  const [showDiag, setShowDiag] = useState(false);
  const [fase, setFase] = useState('iniciando'); // iniciando | buscando | ayuda

  const frameRef = useRef(null);
  const readerRef = useRef(null);
  const initIdRef = useRef(0);
  const failCountRef = useRef(0);
  const motorRef = useRef(null);
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const queueRef = useRef(Promise.resolve());
  const lastReadRef = useRef({ text: '', at: 0 });

  // Siempre el valor del último render, sin entrar en las dependencias del efecto.
  const onScanSuccessRef = useRef(onScanSuccess);
  const isProcessingRef = useRef(isProcessing);
  onScanSuccessRef.current = onScanSuccess;
  isProcessingRef.current = isProcessing;

  // Serializa arranques y paradas para no dejar dos instancias (StrictMode).
  const enqueue = useCallback((task) => {
    queueRef.current = queueRef.current.then(task, task);
    return queueRef.current;
  }, []);

  const stopInstance = useCallback(async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (!instance) return;
    // Se decide por el estado de la librería (state-manager.js), no por instance.isScanning:
    // ese campo solo pasa a true en el evento "playing" del video, y entre el fin de start()
    // y ese evento clear() lanzaría "Cannot clear while scan is ongoing".
    try {
      if (instance.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
        await instance.stop();
      }
    } catch (err) {
      console.warn('[SCANNER CLEANUP]:', err);
    }
    try {
      if (instance.getState() === Html5QrcodeScannerState.NOT_STARTED) {
        instance.clear();
      }
    } catch (err) {
      console.warn('[SCANNER CLEANUP]:', err);
    }
    if (mountedRef.current) setIsCameraActive(false);
  }, []);

  const handleDecoded = useCallback((decodedText) => {
    if (isProcessingRef.current) return;
    const now = Date.now();
    const last = lastReadRef.current;
    if (decodedText === last.text && now - last.at < REPEAT_COOLDOWN_MS) return;
    lastReadRef.current = { text: decodedText, at: now };
    if (import.meta.env.DEV) console.debug('[BARCODE DETECTED]:', decodedText);
    try { navigator.vibrate?.(80); } catch (e) { /* sin vibración disponible */ }
    onScanSuccessRef.current(decodedText);
  }, []);

  const startScanner = useCallback((cameraId) => enqueue(async () => {
    if (!mountedRef.current) return;
    try {
      setCameraError(null);
      setFase('iniciando');
      await stopInstance();
      if (!mountedRef.current) return;

      motorRef.current = await cargarDetectorDeCodigos();
      if (!mountedRef.current) return;

      const html5QrCode = new Html5Qrcode(READER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: SCANNER_FORMATS,
      });
      scannerRef.current = html5QrCode;

      // Con videoConstraints la librería ignora el primer argumento de start(),
      // así que la cámara se incluye aquí. Resolución ideal, nunca exact.
      const videoConstraints = {
        ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      await html5QrCode.start(
        videoConstraints,
        {
          fps: 15,
          qrbox: getQrbox,
          aspectRatio: 1.777778,
          videoConstraints,
        },
        handleDecoded,
        () => { failCountRef.current += 1; }
      );

      if (!mountedRef.current) {
        await stopInstance();
        return;
      }
      if (import.meta.env.DEV) {
        try {
          const { width, height, frameRate } = html5QrCode.getRunningTrackSettings();
          console.debug('[SCANNER TRACK]:', { width, height, frameRate });
        } catch (e) {
          // sin detalles de pista disponibles
        }
      }
      setIsCameraActive(true);
      setFase('buscando');
    } catch (err) {
      console.error('[CAMERA START ERROR]:', err);
      await stopInstance();
      if (!mountedRef.current) return;
      setCameraError(describeCameraError(err));
      setShowManualInput(true);
      setIsCameraActive(false);
    }
  }), [enqueue, stopInstance, handleDecoded]);

  const initCameras = useCallback(() => {
    setCameraError(null);
    initIdRef.current += 1;
    const initId = initIdRef.current;
    if (!window.isSecureContext) {
      setCameraError(describeCameraError(null));
      setShowManualInput(true);
      return;
    }
    Html5Qrcode.getCameras()
      .then((devices) => {
        // initId descarta la enumeración de un montaje anterior (doble montaje de StrictMode).
        if (!mountedRef.current || initId !== initIdRef.current) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCamera = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')
          );
          const initialId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(initialId);
          startScanner(initialId);
        } else {
          setCameraError('No se encontró ninguna cámara en este dispositivo.');
          setShowManualInput(true);
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        console.warn('[CAMERAS ENUMERATION ERROR]:', err);
        setCameraError(describeCameraError(err));
        setShowManualInput(true);
      });
  }, [startScanner]);

  // Arranca una sola vez al abrir; no depende de onScanSuccess ni de isProcessing.
  useEffect(() => {
    mountedRef.current = true;
    initCameras();
    return () => {
      mountedRef.current = false;
      initIdRef.current += 1;
      enqueue(stopInstance);
    };
  }, [initCameras, enqueue, stopInstance]);

  // Alto del marco = alto del video (con tope) y escala = ancho del marco / ancho lógico.
  useEffect(() => {
    const frame = frameRef.current;
    const reader = readerRef.current;
    if (!frame || !reader || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const frameWidth = frame.clientWidth;
      if (!frameWidth) return;
      const scale = frameWidth / LAYOUT_WIDTH;
      const videoHeight = reader.offsetHeight || Math.round(LAYOUT_WIDTH * DEFAULT_VIDEO_RATIO);
      setGeometry((prev) => (
        prev.scale === scale && prev.videoHeight === videoHeight ? prev : { scale, videoHeight }
      ));
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(reader);
    update();
    return () => observer.disconnect();
  }, []);

  // Tras AYUDA_TRAS_MS buscando sin lectura pasa a "ayuda". Depende solo de la fase:
  // se limpia al cambiar de fase o desmontar, y se reinicia al reintentar (vuelve a "iniciando").
  useEffect(() => {
    if (fase !== 'buscando') return undefined;
    const timer = setTimeout(() => setFase('ayuda'), AYUDA_TRAS_MS);
    return () => clearTimeout(timer);
  }, [fase]);

  // Diagnóstico solo en desarrollo (no llega al build): se actualiza cada segundo.
  useEffect(() => {
    if (!import.meta.env.DEV || !showDiag) return undefined;
    const timer = setInterval(() => {
      const video = readerRef.current?.querySelector('video');
      const frame = frameRef.current;
      const last = lastReadRef.current;
      setDiag([
        `Diag escáner · video ${video ? `${video.videoWidth}x${video.videoHeight}` : '-'}`,
        `en pantalla ${video ? `${video.clientWidth}x${video.clientHeight}` : '-'} (lógico)`,
        `marco ${frame ? `${frame.clientWidth}x${frame.clientHeight}` : '-'}`,
        `recuadro ${lastQrbox ? `${lastQrbox.width}x${lastQrbox.height}` : '-'}`,
        `BarcodeDetector: ${'BarcodeDetector' in window ? 'sí' : 'no'}`,
        `motor: ${motorRef.current || '-'}`,
        last.text ? `última lectura ${last.text} (hace ${Math.round((Date.now() - last.at) / 1000)} s)` : `sin lectura, ${failCountRef.current} cuadros sin código`,
      ].join(' · '));
    }, 1000);
    return () => clearInterval(timer);
  }, [showDiag]);

  const visibleHeight = Math.min(geometry.videoHeight, Math.floor(LAYOUT_WIDTH * MAX_VISIBLE_RATIO));
  const frameStyle = { height: Math.round(visibleHeight * geometry.scale) + FRAME_BORDER_PX };
  const stageStyle = {
    width: LAYOUT_WIDTH,
    transformOrigin: 'top left',
    transform: `translateY(${-((geometry.videoHeight - visibleHeight) / 2) * geometry.scale}px) scale(${geometry.scale})`,
  };

  const handleRetry = () => {
    if (selectedCameraId) startScanner(selectedCameraId);
    else initCameras();
  };

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
      <div
        ref={frameRef}
        style={frameStyle}
        className="relative overflow-hidden rounded-xl bg-black border-2 border-gray-300 shadow-inner"
      >
        <div style={stageStyle} className="absolute top-0 left-0">
          <div id={READER_ELEMENT_ID} ref={readerRef} className="w-full" />
        </div>

        {!cameraError && <EstadoEscaner fase={fase} onEscribir={() => setShowManualInput(true)} />}

        {cameraError && (
          <div className="absolute inset-0 bg-white/95 p-5 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-xs text-gray-700 font-medium mb-3 max-w-xs">{cameraError}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar acceso a cámara
            </button>
          </div>
        )}
      </div>

      {import.meta.env.DEV && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowDiag((v) => !v)} className="text-[10px] text-gray-400 underline">
            Diag escáner
          </button>
          {showDiag && diag && (
            <p className="mt-1 text-[10px] leading-tight font-mono text-gray-400 break-words">{diag}</p>
          )}
        </div>
      )}

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

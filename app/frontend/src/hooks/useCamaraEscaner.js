import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { cargarDetectorDeCodigos } from '../utils/cargarDetectorDeCodigos';
import { describeCameraError } from '../utils/errorCamara';
import { calcularQrbox } from '../utils/geometriaEscaner';

export const READER_ELEMENT_ID = 'reader-container';
const AYUDA_TRAS_MS = 8000;
const REPEAT_COOLDOWN_MS = 3000;

// Solo códigos 1D de libros/retail; se excluye UPC_EAN_EXTENSION (precio de 5 dígitos).
const SCANNER_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

// Ciclo de vida de Html5Qrcode: cola, arranque/parada, enumeración, fase y lectura con cooldown.
// abrirEntradaManual debe ser estable (el setter de useState lo es).
export function useCamaraEscaner({ onScanSuccess, isProcessing, abrirEntradaManual }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [fase, setFase] = useState('iniciando'); // iniciando | buscando | ayuda

  const initIdRef = useRef(0);
  const failCountRef = useRef(0);
  const motorRef = useRef(null);
  const qrboxRef = useRef(null);
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

  // qrbox como función: la librería la llama con el tamaño del video; se guarda el último
  // para la línea de diagnóstico.
  const getQrbox = useCallback((viewfinderWidth, viewfinderHeight) => {
    qrboxRef.current = calcularQrbox(viewfinderWidth, viewfinderHeight);
    return qrboxRef.current;
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
      abrirEntradaManual(true);
      setIsCameraActive(false);
    }
  }), [enqueue, stopInstance, handleDecoded, getQrbox, abrirEntradaManual]);

  const initCameras = useCallback(() => {
    setCameraError(null);
    initIdRef.current += 1;
    const initId = initIdRef.current;
    if (!window.isSecureContext) {
      setCameraError(describeCameraError(null));
      abrirEntradaManual(true);
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
          abrirEntradaManual(true);
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        console.warn('[CAMERAS ENUMERATION ERROR]:', err);
        setCameraError(describeCameraError(err));
        abrirEntradaManual(true);
      });
  }, [startScanner, abrirEntradaManual]);

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

  // Tras AYUDA_TRAS_MS buscando sin lectura pasa a "ayuda". Depende solo de la fase:
  // se limpia al cambiar de fase o desmontar, y se reinicia al reintentar (vuelve a "iniciando").
  useEffect(() => {
    if (fase !== 'buscando') return undefined;
    const timer = setTimeout(() => setFase('ayuda'), AYUDA_TRAS_MS);
    return () => clearTimeout(timer);
  }, [fase]);

  const reintentar = () => {
    if (selectedCameraId) startScanner(selectedCameraId);
    else initCameras();
  };

  const cambiarCamara = (newId) => {
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  return {
    cameras,
    selectedCameraId,
    cameraError,
    isCameraActive,
    fase,
    reintentar,
    cambiarCamara,
    refsDiagnostico: { lastReadRef, failCountRef, motorRef, qrboxRef },
  };
}

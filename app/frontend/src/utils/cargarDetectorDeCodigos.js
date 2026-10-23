// Garantiza un BarcodeDetector antes de crear Html5Qrcode (que lo evalúa en su constructor).
// Devuelve 'nativo' (el navegador lo trae; no se importa nada), 'wasm' (lector de respaldo)
// o 'js' (la carga falló: se usa el decodificador en JavaScript de html5-qrcode).
// El .wasm se sirve desde el propio sitio: por defecto la librería lo pediría a un CDN externo.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

let carga = null;

async function cargarRespaldo() {
  try {
    const { prepareZXingModule } = await import('barcode-detector/polyfill');
    // Debe fijarse antes de la primera decodificación; la instancia se crea de forma perezosa.
    prepareZXingModule({
      overrides: {
        locateFile: (ruta, prefijo) => (ruta.endsWith('.wasm') ? wasmUrl : prefijo + ruta),
      },
    });
    return 'wasm';
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[BARCODE] Lector de respaldo no disponible:', error);
    return 'js';
  }
}

export function cargarDetectorDeCodigos() {
  if ('BarcodeDetector' in window) return Promise.resolve('nativo');
  if (!carga) carga = cargarRespaldo();
  return carga;
}

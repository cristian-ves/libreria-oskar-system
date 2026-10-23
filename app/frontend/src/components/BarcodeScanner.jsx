import React, { useState } from 'react';
import { Camera, RefreshCw, Keyboard, Check, ShieldAlert } from 'lucide-react';
import EstadoEscaner from './EstadoEscaner';
import { useCamaraEscaner, READER_ELEMENT_ID } from '../hooks/useCamaraEscaner';
import { useGeometriaEscaner } from '../hooks/useGeometriaEscaner';
import { useDiagnosticoEscaner } from '../hooks/useDiagnosticoEscaner';

export default function BarcodeScanner({ onScanSuccess, isProcessing, onClose }) {
  const [manualIsbn, setManualIsbn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const {
    cameras, selectedCameraId, cameraError, fase, reintentar, cambiarCamara, refsDiagnostico,
  } = useCamaraEscaner({ onScanSuccess, isProcessing, abrirEntradaManual: setShowManualInput });
  const { frameRef, readerRef, frameStyle, stageStyle } = useGeometriaEscaner();
  const { diag, showDiag, alternarDiag } = useDiagnosticoEscaner({ readerRef, frameRef, ...refsDiagnostico });

  const handleCameraChange = (e) => cambiarCamara(e.target.value);

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

        {cameraError && (
          <div className="absolute inset-0 bg-white/95 p-5 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 mb-2" />
            <p className="text-xs text-gray-700 font-medium mb-3 max-w-xs">{cameraError}</p>
            <button
              onClick={reintentar}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar acceso a cámara
            </button>
          </div>
        )}
      </div>

      {!cameraError && <EstadoEscaner fase={fase} onEscribir={() => setShowManualInput(true)} />}

      {import.meta.env.DEV && (
        <div className="mt-2">
          <button type="button" onClick={alternarDiag} className="text-[10px] text-gray-400 underline">
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

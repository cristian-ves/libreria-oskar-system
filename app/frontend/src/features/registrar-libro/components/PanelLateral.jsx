import { Camera, UserCheck } from 'lucide-react';
import BarcodeScanner from '../../../components/BarcodeScanner';
import HistorialSesion from './HistorialSesion';

export default function PanelLateral({ user, isCameraOpen, setIsCameraOpen, onScanSuccess, isLoading, historial }) {
  return (
    <div className="lg:col-span-4 space-y-5">
      {/* Operador */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#e8c85e] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-[#252525]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#252525]">{user?.nombre_completo}</p>
            <p className="text-[10px] text-gray-500 font-mono">Operador activo</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-[#f3f3f3] text-[#252525] font-bold font-mono border border-gray-200 shrink-0">
          {user?.rol}
        </span>
      </div>

      {/* Escáner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#e19922]" />
          Escanear ISBN
        </h2>
        {!isCameraOpen ? (
          <div className="text-center py-5 px-3 bg-[#f3f3f3] rounded-xl border-2 border-dashed border-gray-300 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-[#e8c85e] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Camera className="w-6 h-6 text-[#252525]" />
            </div>
            <p className="text-xs text-gray-600 mb-3 max-w-xs mx-auto">
              Activa la cámara para capturar el ISBN automáticamente.
            </p>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="inline-flex items-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Activar Cámara
            </button>
          </div>
        ) : (
          <BarcodeScanner
            onScanSuccess={onScanSuccess}
            isProcessing={isLoading}
            onClose={() => setIsCameraOpen(false)}
          />
        )}
      </div>

      {/* Historial sesión */}
      {historial.length > 0 && (
        <HistorialSesion historial={historial} />
      )}
    </div>
  );
}

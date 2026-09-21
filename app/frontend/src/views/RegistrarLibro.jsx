import React, { useState, useEffect } from 'react';
import { Camera, Warehouse, UserCheck, Barcode, CheckCircle, Clock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RegistrarLibro({ onShowToast }) {
  // Estado de bodegas y selección previa
  const [bodegas, setBodegas] = useState([]);
  const [selectedBodegaId, setSelectedBodegaId] = useState('');
  const [loadingBodegas, setLoadingBodegas] = useState(true);

  // Estado del usuario activo (Bodeguero / Empleado)
  const [usuarioId, setUsuarioId] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('Carlos Empleado');

  // Control del escáner y cámara
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Resultado del último escaneo e historial de la sesión
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [historialEscaneos, setHistorialEscaneos] = useState([]);

  // Cargar bodegas y usuario por defecto al montar
  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        setLoadingBodegas(true);
        // Intentar cargar bodegas desde el backend
        const resBodegas = await fetch('/api/bodegas');
        if (resBodegas.ok) {
          const json = await resBodegas.json();
          if (json.data && json.data.length > 0) {
            setBodegas(json.data);
            setSelectedBodegaId(json.data[0].id);
          }
        }
      } catch (err) {
        console.warn('[BODEGAS FETCH]: Usando datos por defecto:', err.message);
      } finally {
        setLoadingBodegas(false);
      }

      // Cargar usuario activo
      try {
        const resUsuarios = await fetch('/api/usuarios');
        if (resUsuarios.ok) {
          const json = await resUsuarios.json();
          if (json.data && json.data.length > 0) {
            const empleado = json.data.find(u => u.rol_nombre === 'Empleado') || json.data[0];
            setUsuarioId(empleado.id);
            setUsuarioNombre(empleado.nombre_completo);
          }
        }
      } catch (err) {
        console.warn('[USUARIO FETCH]:', err.message);
      }
    }

    cargarDatosIniciales();
  }, []);

  // Handler principal: se dispara inmediatamente al detectar el código de barras en tiempo real
  const handleScanSuccess = async (scannedIsbn) => {
    if (!scannedIsbn) return;

    if (!selectedBodegaId) {
      onShowToast({
        type: 'error',
        title: 'Bodega requerida',
        message: 'Por favor selecciona una bodega antes de escanear.',
      });
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);
    setProcessingMessage(
      `Consultando Google Books API y registrando ISBN: ${scannedIsbn}...`
    );

    try {
      const response = await fetch('/api/libros/escanear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: scannedIsbn,
          bodegaId: selectedBodegaId,
          usuarioId: usuarioId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al procesar el escaneo del libro.');
      }

      const { data } = result;

      // Actualizar estado local del último escaneo
      setUltimoResultado(data);
      setHistorialEscaneos((prev) => [data, ...prev]);

      // Notificación flotante de éxito con el título del libro recuperado
      onShowToast({
        type: 'success',
        title: data.es_nuevo_en_catalogo ? '¡Nuevo Libro Catalogado!' : '¡Ingreso de Stock Registrado!',
        bookTitle: data.libro.titulo,
        message: `Se ingresó 1 unidad al inventario (Stock total: ${data.inventario.stock_actual}).`,
        stockInfo: {
          anterior: data.inventario.stock_anterior,
          actual: data.inventario.stock_actual,
        },
      });

    } catch (error) {
      console.error('[ERROR ESCANEO]:', error);
      onShowToast({
        type: 'error',
        title: 'Fallo al procesar libro',
        message: error.message || 'No se pudo completar la operación de escaneo.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedBodegaObj = bodegas.find((b) => b.id === selectedBodegaId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Spinner de carga overlay durante consultas a Google Books API */}
      {isProcessing && <LoadingSpinner message={processingMessage} />}

      {/* Encabezado de la sección */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
          <Barcode className="w-4 h-4" />
          <span>Módulo de Recepción e Inventario</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Registrar Libro en Bodega
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Selecciona la bodega de destino y activa la cámara para escanear en tiempo real el código de barras (ISBN).
          Los datos bibliográficos serán obtenidos automáticamente desde la API de Google Books.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel Izquierdo: Selección previa y Control del Escáner */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card de Configuración Previa */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              1. Selección Previa de Bodega y Operador
            </h2>

            {/* Dropdown de Bodega */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bodega de Destino <span className="text-emerald-400">*</span>
              </label>
              {loadingBodegas ? (
                <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={selectedBodegaId}
                  onChange={(e) => setSelectedBodegaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer font-medium"
                >
                  {bodegas.length === 0 ? (
                    <option value="">Cargando bodegas...</option>
                  ) : (
                    bodegas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} {b.sucursal_nombre ? `(${b.sucursal_nombre})` : ''}
                      </option>
                    ))
                  )}
                </select>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                El stock del libro escaneado incrementará atómicamente en esta bodega.
              </p>
            </div>

            {/* Operador activo */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{usuarioNombre}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Registrador de Movimiento</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono border border-emerald-500/30">
                Rol: Empleado
              </span>
            </div>
          </div>

          {/* Card del Escáner de Cámara */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              2. Captura en Tiempo Real (ISBN)
            </h2>

            {!isCameraOpen ? (
              <div className="text-center py-6 px-4 bg-slate-950/60 rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-500/40 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Cámara Desactivada
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
                  Haz clic en el botón inferior para activar la cámara web y capturar códigos de barras automáticamente.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={!selectedBodegaId}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-emerald-950/50 transition-all transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activar Cámara / Escanear Código</span>
                </button>
              </div>
            ) : (
              <BarcodeScanner
                onScanSuccess={handleScanSuccess}
                isProcessing={isProcessing}
                onClose={() => setIsCameraOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Panel Derecho: Resultado del Escaneo e Historial */}
        <div className="lg:col-span-7 space-y-6">
          {/* Resultado del libro recién escaneado */}
          {ultimoResultado ? (
            <div>
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Libro Ingresado Recientemente
              </h2>
              <BookCard
                data={ultimoResultado}
                bodegaNombre={selectedBodegaObj?.nombre}
              />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Barcode className="w-8 h-8 text-emerald-400/60" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                Esperando Primer Escaneo
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Cuando apuntes un código de barras o ISBN frente a la cámara, el sistema consultará en tiempo real la
                API de Google Books e ingresará automáticamente el ejemplar al inventario con confirmación visual.
              </p>
            </div>
          )}

          {/* Historial de la Sesión */}
          {historialEscaneos.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Historial de Ingresos de esta Sesión ({historialEscaneos.length})
                </h3>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {historialEscaneos.map((item, idx) => (
                  <div
                    key={`${item.libro.id}-${idx}`}
                    className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0">
                        #{historialEscaneos.length - idx}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {item.libro.titulo}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ISBN: {item.libro.isbn} · {item.libro.autor}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-emerald-400 font-bold">
                        Stock: {item.inventario.stock_actual}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.movimiento.fecha_movimiento).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

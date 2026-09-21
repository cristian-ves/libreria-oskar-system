import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Warehouse, UserCheck, Barcode, CheckCircle,
  Clock, ArrowRight, ShieldCheck, AlertCircle, PlusCircle,
  PackagePlus, RefreshCw, BookOpen, Eye, EyeOff,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';

// ─── constantes ──────────────────────────────────────────────────────────────
const AUTOR_PLACEHOLDER = 'Autor de Biblioteca Internacional';

// ─── helpers ─────────────────────────────────────────────────────────────────
function orNull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function toNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

// ─── sub-componentes pequeños ─────────────────────────────────────────────────
function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{error.message}</p>
        {Array.isArray(error.details) && error.details.length > 0 && (
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-red-300">
            {error.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
      {children}{required && <span className="text-emerald-400 ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function RegistrarLibro({ onShowToast }) {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'Administrador';

  // ── datos maestros ──────────────────────────────────────────────────────────
  const [bodegas, setBodegas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingMaestros, setLoadingMaestros] = useState(true);

  // ── escáner ─────────────────────────────────────────────────────────────────
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');

  // ── estados del flujo ───────────────────────────────────────────────────────
  // 'consulta' | 'existe' | 'noExiste'
  const [paso, setPaso] = useState('consulta');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBox, setErrorBox] = useState(null);

  // ── resultado de /consultar ─────────────────────────────────────────────────
  const [libroExistente, setLibroExistente] = useState(null);   // data.libro
  const [inventarios, setInventarios] = useState([]);           // data.inventarios
  const [sugerencia, setSugerencia] = useState(null);           // data.sugerencia

  // ── formulario de ingreso (libro existente) ─────────────────────────────────
  const [ingresoForm, setIngresoForm] = useState({ bodegaId: '', cantidad: 1 });
  const [ingresoResultado, setIngresoResultado] = useState(null);

  // ── formulario de registro (libro nuevo) ───────────────────────────────────
  const [regForm, setRegForm] = useState({
    isbn: '', titulo: '', autor: '', editorial: '',
    categoriaId: '', resena: '', imagenUrl: '',
    precio: '', cantidad: 1, stockMinimo: 5, bodegaId: '',
  });
  const [imgError, setImgError] = useState(false);
  const [regResultado, setRegResultado] = useState(null);

  // ── historial sesión ────────────────────────────────────────────────────────
  const [historial, setHistorial] = useState([]);

  // ── cargar datos maestros al montar ────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      setLoadingMaestros(true);
      try {
        const [resBod, resCat] = await Promise.all([
          apiFetch('/api/bodegas'),
          apiFetch('/api/categorias'),
        ]);
        if (resBod.ok) {
          const j = await resBod.json();
          const data = j.data || [];
          setBodegas(data);
          const primeraId = data[0]?.id || '';
          setIngresoForm(f => ({ ...f, bodegaId: primeraId }));
          setRegForm(f => ({ ...f, bodegaId: primeraId }));
        }
        if (resCat.ok) {
          const j = await resCat.json();
          setCategorias(j.data || []);
        }
      } catch (err) {
        console.warn('[MAESTROS]:', err.message);
      } finally {
        setLoadingMaestros(false);
      }
    }
    cargar();
  }, []);

  // ── acción consultar ────────────────────────────────────────────────────────
  const handleConsultar = useCallback(async (isbnValue) => {
    const isbn = (isbnValue || isbnInput).trim();
    if (!isbn) {
      setErrorBox({ message: 'Ingresa un ISBN antes de consultar.' });
      return;
    }
    setErrorBox(null);
    setIsLoading(true);
    setIngresoResultado(null);
    setRegResultado(null);

    try {
      const res = await apiFetch('/api/libros/consultar', {
        method: 'POST',
        body: JSON.stringify({ isbn }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorBox({ message: json.message || 'Error al consultar el ISBN.', details: json.details });
        return;
      }

      const { existe, libro, inventarios: invs, sugerencia: sug } = json.data;

      if (existe) {
        setLibroExistente(libro);
        setInventarios(invs || []);
        setPaso('existe');
      } else {
        setSugerencia(sug);
        // Precargar formulario con sugerencia
        setRegForm(f => ({
          ...f,
          isbn: sug?.isbn || isbn,
          titulo: sug?.titulo || '',
          autor: (!sug || sug.autor === AUTOR_PLACEHOLDER) ? '' : (sug.autor || ''),
          editorial: sug?.editorial || '',
          resena: sug?.resena || '',
          imagenUrl: sug?.imagen_url || '',
          precio: '',
        }));
        setImgError(false);
        setPaso('noExiste');
      }
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red al consultar.' });
    } finally {
      setIsLoading(false);
    }
  }, [isbnInput]);

  // ── cámara detecta ISBN ─────────────────────────────────────────────────────
  const handleScanSuccess = useCallback(async (scannedIsbn) => {
    if (!scannedIsbn || isLoading) return;
    setIsbnInput(scannedIsbn);
    setIsCameraOpen(false);
    await handleConsultar(scannedIsbn);
  }, [isLoading, handleConsultar]);

  // ── agregar manualmente (salta sin consultar) ───────────────────────────────
  const handleAgregarManual = () => {
    setErrorBox(null);
    setSugerencia(null);
    setRegForm(f => ({
      ...f,
      isbn: isbnInput.trim(),
      titulo: '', autor: '', editorial: '',
      categoriaId: '', resena: '', imagenUrl: '',
      precio: '', cantidad: 1, stockMinimo: 5,
    }));
    setImgError(false);
    setPaso('noExiste');
  };

  // ── reiniciar flujo ─────────────────────────────────────────────────────────
  const reiniciar = () => {
    setPaso('consulta');
    setIsbnInput('');
    setLibroExistente(null);
    setInventarios([]);
    setSugerencia(null);
    setIngresoResultado(null);
    setRegResultado(null);
    setErrorBox(null);
  };

  // ── enviar ingreso (libro existente) ────────────────────────────────────────
  const handleIngreso = async (e) => {
    e.preventDefault();
    setErrorBox(null);
    if (!ingresoForm.bodegaId) {
      setErrorBox({ message: 'Selecciona una bodega.' }); return;
    }
    if (!ingresoForm.cantidad || ingresoForm.cantidad < 1) {
      setErrorBox({ message: 'La cantidad debe ser un entero ≥ 1.' }); return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/libros/${libroExistente.id}/ingreso`, {
        method: 'POST',
        body: JSON.stringify({
          bodegaId: ingresoForm.bodegaId,
          cantidad: Number(ingresoForm.cantidad),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorBox({ message: json.message || 'Error al registrar ingreso.', details: json.details });
        return;
      }
      const resultado = json.data;
      setIngresoResultado(resultado);
      setHistorial(h => [{ tipo: 'ingreso', ...resultado }, ...h]);
      onShowToast({
        type: 'success',
        title: '¡Ingreso Registrado!',
        bookTitle: resultado.libro.titulo,
        message: `Stock actualizado: ${resultado.inventario.stock_actual} uds. en bodega.`,
      });
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── enviar registro (libro nuevo) ───────────────────────────────────────────
  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErrorBox(null);

    // Validaciones mínimas en cliente
    if (!regForm.titulo.trim()) { setErrorBox({ message: 'El título es obligatorio.' }); return; }
    if (!regForm.resena.trim()) { setErrorBox({ message: 'La reseña es obligatoria.' }); return; }
    if (!regForm.bodegaId) { setErrorBox({ message: 'Selecciona una bodega.' }); return; }
    if (!regForm.cantidad || Number(regForm.cantidad) < 1) {
      setErrorBox({ message: 'La cantidad debe ser un entero ≥ 1.' }); return;
    }

    setIsLoading(true);
    try {
      const body = {
        isbn: orNull(regForm.isbn),
        titulo: regForm.titulo.trim(),
        autor: orNull(regForm.autor),
        editorial: orNull(regForm.editorial),
        categoriaId: orNull(regForm.categoriaId),
        resena: regForm.resena.trim(),
        imagenUrl: orNull(regForm.imagenUrl),
        cantidad: Number(regForm.cantidad),
        stockMinimo: toNum(regForm.stockMinimo, 5),
        bodegaId: regForm.bodegaId,
      };
      // Precio: solo si es Administrador
      if (esAdmin) {
        body.precio = toNum(regForm.precio, 0);
      }

      const res = await apiFetch('/api/libros/registrar', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorBox({ message: json.message || 'Error al registrar el libro.', details: json.details });
        return;
      }
      const resultado = json.data;
      setRegResultado(resultado);
      setHistorial(h => [{ tipo: 'registro', ...resultado }, ...h]);
      onShowToast({
        type: 'success',
        title: '¡Libro Registrado!',
        bookTitle: resultado.libro.titulo,
        message: resultado.precio_pendiente
          ? 'El libro fue registrado. El precio está pendiente de asignación.'
          : `Stock inicial: ${resultado.inventario.stock_actual} uds.`,
      });
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const bodegaNombrePorId = (id) => {
    const b = bodegas.find(x => x.id === id);
    return b ? `${b.nombre}${b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}` : id;
  };

  // ─── panel izquierdo: siempre visible ────────────────────────────────────────
  const PanelIzquierdo = () => (
    <div className="lg:col-span-4 space-y-5">
      {/* Operador */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{user?.nombre_completo}</p>
            <p className="text-[10px] text-slate-400 font-mono">Operador activo</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono border border-emerald-500/30 shrink-0">
          {user?.rol}
        </span>
      </div>

      {/* Escáner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          Escanear ISBN
        </h2>
        {!isCameraOpen ? (
          <div className="text-center py-5 px-3 bg-slate-950/60 rounded-xl border-2 border-dashed border-slate-800 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 mb-3 max-w-xs mx-auto">
              Activa la cámara para capturar el ISBN automáticamente.
            </p>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Activar Cámara
            </button>
          </div>
        ) : (
          <BarcodeScanner
            onScanSuccess={handleScanSuccess}
            isProcessing={isLoading}
            onClose={() => setIsCameraOpen(false)}
          />
        )}
      </div>

      {/* Historial sesión */}
      {historial.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            Historial ({historial.length})
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {historial.map((item, idx) => (
              <div
                key={`${item.libro?.id || idx}-${idx}`}
                className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{item.libro?.titulo}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {item.tipo === 'registro' ? 'Registro nuevo' : 'Ingreso'} ·{' '}
                    {item.movimiento?.fecha_movimiento
                      ? new Date(item.movimiento.fecha_movimiento).toLocaleTimeString()
                      : ''}
                  </p>
                </div>
                <span className="font-mono text-emerald-400 font-bold shrink-0">
                  +{item.movimiento?.cantidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── PASO: CONSULTA ───────────────────────────────────────────────────────────
  if (paso === 'consulta') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Consultando ISBN..." />}

        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Barcode className="w-4 h-4" />
            <span>Módulo de Recepción e Inventario</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Registrar Libro en Bodega
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Ingresa o escanea el ISBN para consultar si el libro existe en el sistema. Si no existe, podrás registrarlo manualmente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          {/* Panel derecho: formulario de consulta */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-emerald-400" />
                Paso 1 — Consultar ISBN
              </h2>

              <ErrorBox error={errorBox} />

              <div className="mt-4 space-y-4">
                <div>
                  <FieldLabel required>Código ISBN</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={isbnInput}
                      onChange={e => setIsbnInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConsultar()}
                      placeholder="Ej. 9780132350884"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => handleConsultar()}
                      disabled={isLoading || !isbnInput.trim()}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Consultar
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Puedes teclear el ISBN manualmente o capturarlo con la cámara.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-slate-800" />
                  <span className="text-xs text-slate-500">o</span>
                  <div className="flex-1 border-t border-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleAgregarManual}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-medium px-4 py-3 rounded-xl transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  Agregar manualmente sin ISBN
                </button>
              </div>
            </div>

            {/* Placeholder espera */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-400/50" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Esperando ISBN</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Cuando consultes un ISBN el sistema verificará si el libro ya está en el catálogo local.
                Si existe, podrás ingresar unidades directamente; si no, se abrirá el formulario de registro.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PASO: LIBRO EXISTE ───────────────────────────────────────────────────────
  if (paso === 'existe') {
    const precio = Number(libroExistente.precio);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Registrando ingreso..." />}

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>Libro encontrado en catálogo</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ingresar Unidades</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Registrar otro
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          <div className="lg:col-span-8 space-y-5">
            {/* Tarjeta del libro */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex gap-4">
                {/* Portada */}
                {libroExistente.imagen_url && (
                  <div className="shrink-0">
                    <img
                      src={libroExistente.imagen_url}
                      alt={libroExistente.titulo}
                      className="w-20 h-28 object-cover rounded-xl border border-slate-700 shadow-lg"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      En catálogo
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug mb-1 line-clamp-2">
                    {libroExistente.titulo}
                  </h2>
                  {libroExistente.autor_nombre && (
                    <p className="text-sm text-slate-300 mb-0.5">{libroExistente.autor_nombre}</p>
                  )}
                  {libroExistente.editorial_nombre && (
                    <p className="text-xs text-slate-500">{libroExistente.editorial_nombre}</p>
                  )}
                  {esAdmin && (
                    <p className="text-xs text-emerald-400 font-mono mt-1">
                      Precio: ${precio.toFixed(2)}
                    </p>
                  )}
                  {libroExistente.isbn && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">ISBN: {libroExistente.isbn}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stock por bodega */}
            {inventarios.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  Stock actual por bodega
                </h3>
                <div className="space-y-2">
                  {inventarios.map(inv => (
                    <div
                      key={inv.bodega_id}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{inv.bodega_nombre}</span>
                        {inv.sucursal_nombre && (
                          <span className="text-slate-500 ml-1.5">· {inv.sucursal_nombre}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${inv.stock_actual <= inv.stock_minimo ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {inv.stock_actual} uds.
                        </span>
                        <span className="text-slate-600 ml-1">(mín. {inv.stock_minimo})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario ingreso */}
            {!ingresoResultado ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  Ingresar Unidades
                </h3>
                <ErrorBox error={errorBox} />
                <form onSubmit={handleIngreso} className="mt-4 space-y-4">
                  <div>
                    <FieldLabel required>Bodega de destino</FieldLabel>
                    {loadingMaestros ? (
                      <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                    ) : (
                      <Select
                        value={ingresoForm.bodegaId}
                        onChange={e => setIngresoForm(f => ({ ...f, bodegaId: e.target.value }))}
                        disabled={isLoading}
                      >
                        <option value="">— Selecciona bodega —</option>
                        {bodegas.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}{b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  <div>
                    <FieldLabel required>Cantidad</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={ingresoForm.cantidad}
                      onChange={e => setIngresoForm(f => ({ ...f, cantidad: e.target.value }))}
                      disabled={isLoading}
                      placeholder="1"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <PackagePlus className="w-4 h-4" />
                    {isLoading ? 'Registrando...' : 'Confirmar Ingreso'}
                  </button>
                </form>
              </div>
            ) : (
              /* Resultado ingreso */
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    Ingreso Registrado
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <p className="text-slate-400 mb-0.5">Unidades ingresadas</p>
                    <p className="text-lg font-bold text-emerald-400">+{ingresoResultado.movimiento.cantidad}</p>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <p className="text-slate-400 mb-0.5">Stock actual</p>
                    <p className="text-lg font-bold text-white">{ingresoResultado.inventario.stock_actual}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Bodega: <span className="text-white font-medium">{bodegaNombrePorId(ingresoResultado.inventario.bodega_id)}</span>
                </p>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="w-full flex items-center justify-center gap-2 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800/50 text-slate-300 hover:text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Registrar otro libro
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── PASO: LIBRO NO EXISTE ────────────────────────────────────────────────────
  if (paso === 'noExiste') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Registrando libro..." />}

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>{sugerencia ? 'Sugerencia de Google Books' : 'Libro no encontrado'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Registrar Libro Nuevo</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Volver
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          <div className="lg:col-span-8 space-y-5">
            {/* Aviso si no hay sugerencia */}
            {!sugerencia && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>No se encontró información en Google Books ni Open Library. Completa los datos manualmente.</span>
              </div>
            )}

            {/* Resultado del registro exitoso */}
            {regResultado ? (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    Libro Registrado Exitosamente
                  </h3>
                </div>
                {regResultado.precio_pendiente && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 mb-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>El libro quedó pendiente de asignación de precio por el Administrador.</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <p className="text-slate-400 mb-0.5">Stock inicial</p>
                    <p className="text-lg font-bold text-emerald-400">{regResultado.inventario.stock_actual}</p>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <p className="text-slate-400 mb-0.5">Stock mínimo</p>
                    <p className="text-lg font-bold text-white">{regResultado.inventario.stock_minimo}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white mb-1 truncate">{regResultado.libro.titulo}</p>
                <p className="text-xs text-slate-400 mb-4 font-mono">ISBN: {regResultado.libro.isbn || '(sin ISBN)'}</p>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="w-full flex items-center justify-center gap-2 border border-slate-700 hover:border-emerald-500/40 hover:bg-slate-800/50 text-slate-300 hover:text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Registrar otro libro
                </button>
              </div>
            ) : (
              /* Formulario de registro */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Datos del Libro
                </h3>

                <ErrorBox error={errorBox} />

                <form onSubmit={handleRegistrar} className="mt-4 space-y-4">
                  {/* ISBN */}
                  <div>
                    <FieldLabel>ISBN</FieldLabel>
                    <Input
                      type="text"
                      value={regForm.isbn}
                      onChange={e => setRegForm(f => ({ ...f, isbn: e.target.value }))}
                      disabled={isLoading}
                      placeholder="Opcional — deja vacío si no tiene ISBN"
                    />
                  </div>

                  {/* Título */}
                  <div>
                    <FieldLabel required>Título</FieldLabel>
                    <Input
                      type="text"
                      value={regForm.titulo}
                      onChange={e => setRegForm(f => ({ ...f, titulo: e.target.value }))}
                      disabled={isLoading}
                      placeholder="Título completo del libro"
                    />
                  </div>

                  {/* Autor / Editorial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Autor</FieldLabel>
                      <Input
                        type="text"
                        value={regForm.autor}
                        onChange={e => setRegForm(f => ({ ...f, autor: e.target.value }))}
                        disabled={isLoading}
                        placeholder="Nombre del autor"
                      />
                    </div>
                    <div>
                      <FieldLabel>Editorial</FieldLabel>
                      <Input
                        type="text"
                        value={regForm.editorial}
                        onChange={e => setRegForm(f => ({ ...f, editorial: e.target.value }))}
                        disabled={isLoading}
                        placeholder="Nombre de la editorial"
                      />
                    </div>
                  </div>

                  {/* Categoría */}
                  <div>
                    <FieldLabel>Categoría</FieldLabel>
                    <Select
                      value={regForm.categoriaId}
                      onChange={e => setRegForm(f => ({ ...f, categoriaId: e.target.value }))}
                      disabled={isLoading || loadingMaestros}
                    >
                      <option value="">— Sin categoría —</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Reseña */}
                  <div>
                    <FieldLabel required>Reseña</FieldLabel>
                    <textarea
                      value={regForm.resena}
                      onChange={e => setRegForm(f => ({ ...f, resena: e.target.value }))}
                      disabled={isLoading}
                      rows={4}
                      placeholder="Descripción o sinopsis del libro..."
                      className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600 disabled:opacity-50 resize-none"
                    />
                  </div>

                  {/* URL de imagen + vista previa */}
                  <div>
                    <FieldLabel>URL de portada</FieldLabel>
                    <Input
                      type="url"
                      value={regForm.imagenUrl}
                      onChange={e => { setRegForm(f => ({ ...f, imagenUrl: e.target.value })); setImgError(false); }}
                      disabled={isLoading}
                      placeholder="https://..."
                    />
                    {regForm.imagenUrl && !imgError && (
                      <div className="mt-2">
                        <img
                          src={regForm.imagenUrl}
                          alt="Vista previa"
                          className="h-24 rounded-lg border border-slate-700 object-cover"
                          onError={() => setImgError(true)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Precio */}
                  <div>
                    <FieldLabel>Precio</FieldLabel>
                    {esAdmin ? (
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={regForm.precio}
                        onChange={e => setRegForm(f => ({ ...f, precio: e.target.value }))}
                        disabled={isLoading}
                        placeholder="0.00"
                      />
                    ) : (
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
                        El administrador asignará el precio
                      </div>
                    )}
                  </div>

                  {/* Cantidad / Stock mínimo / Bodega */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <FieldLabel required>Cantidad inicial</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={regForm.cantidad}
                        onChange={e => setRegForm(f => ({ ...f, cantidad: e.target.value }))}
                        disabled={isLoading}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <FieldLabel>Stock mínimo</FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={regForm.stockMinimo}
                        onChange={e => setRegForm(f => ({ ...f, stockMinimo: e.target.value }))}
                        disabled={isLoading}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Bodega</FieldLabel>
                      {loadingMaestros ? (
                        <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                      ) : (
                        <Select
                          value={regForm.bodegaId}
                          onChange={e => setRegForm(f => ({ ...f, bodegaId: e.target.value }))}
                          disabled={isLoading}
                        >
                          <option value="">— Bodega —</option>
                          {bodegas.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.nombre}{b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    {isLoading ? 'Guardando...' : 'Registrar Libro'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

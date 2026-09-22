import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Warehouse, UserCheck, Barcode, CheckCircle,
  Clock, ArrowRight, ShieldCheck, AlertCircle, PlusCircle,
  PackagePlus, RefreshCw, BookOpen,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';

const AUTOR_PLACEHOLDER = 'Autor de Biblioteca Internacional';

function orNull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function toNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
      <div className="min-w-0">
        <p className="font-bold">{error.message}</p>
        {Array.isArray(error.details) && error.details.length > 0 && (
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-red-600">
            {error.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-bold text-[#252525] mb-1.5">
      {children}{required && <span className="text-[#e19922] ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export default function RegistrarLibro({ onShowToast }) {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'Administrador';

  const [bodegas, setBodegas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingMaestros, setLoadingMaestros] = useState(true);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');

  const [paso, setPaso] = useState('consulta');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBox, setErrorBox] = useState(null);

  const [libroExistente, setLibroExistente] = useState(null);
  const [inventarios, setInventarios] = useState([]);
  const [sugerencia, setSugerencia] = useState(null);

  const [ingresoForm, setIngresoForm] = useState({ bodegaId: '', cantidad: 1 });
  const [ingresoResultado, setIngresoResultado] = useState(null);

  const [regForm, setRegForm] = useState({
    isbn: '', titulo: '', autor: '', editorial: '',
    categoriaId: '', resena: '', imagenUrl: '',
    precio: '', cantidad: 1, stockMinimo: 5, bodegaId: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [imgError, setImgError] = useState(false);
  const [regResultado, setRegResultado] = useState(null);

  const [historial, setHistorial] = useState([]);

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
        setFieldErrors({});
        setImgError(false);
        setPaso('noExiste');
      }
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red al consultar.' });
    } finally {
      setIsLoading(false);
    }
  }, [isbnInput]);

  const handleScanSuccess = useCallback(async (scannedIsbn) => {
    if (!scannedIsbn || isLoading) return;
    setIsbnInput(scannedIsbn);
    setIsCameraOpen(false);
    await handleConsultar(scannedIsbn);
  }, [isLoading, handleConsultar]);

  const handleAgregarManual = () => {
    setErrorBox(null);
    setFieldErrors({});
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

  const reiniciar = () => {
    setPaso('consulta');
    setIsbnInput('');
    setLibroExistente(null);
    setInventarios([]);
    setSugerencia(null);
    setIngresoResultado(null);
    setRegResultado(null);
    setErrorBox(null);
    setFieldErrors({});
  };

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

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErrorBox(null);
    setFieldErrors({});

    const autorTrim = regForm.autor.trim();
    const nuevosFieldErrors = {};

    if (!autorTrim) {
      nuevosFieldErrors.autor = 'El autor es obligatorio.';
    } else if (autorTrim === AUTOR_PLACEHOLDER) {
      nuevosFieldErrors.autor = `Ingresa el nombre real del autor (no se permite "${AUTOR_PLACEHOLDER}").`;
    }

    if (!regForm.categoriaId) {
      nuevosFieldErrors.categoriaId = 'Debes seleccionar una categoría.';
    }

    if (!regForm.titulo.trim()) {
      setErrorBox({ message: 'El título es obligatorio.' });
      return;
    }
    if (Object.keys(nuevosFieldErrors).length > 0) {
      setFieldErrors(nuevosFieldErrors);
      return;
    }
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
        autor: autorTrim,
        editorial: orNull(regForm.editorial),
        categoriaId: regForm.categoriaId,
        resena: regForm.resena.trim(),
        imagenUrl: orNull(regForm.imagenUrl),
        cantidad: Number(regForm.cantidad),
        stockMinimo: toNum(regForm.stockMinimo, 5),
        bodegaId: regForm.bodegaId,
      };
      if (esAdmin) {
        body.precio = toNum(regForm.precio, 0);
      }

      const res = await apiFetch('/api/libros/registrar', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        const details = Array.isArray(json.details) ? json.details : (json.details ? [json.details] : undefined);
        setErrorBox({ message: json.message || 'Error al registrar el libro.', details });
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

  const bodegaNombrePorId = (id) => {
    const b = bodegas.find(x => x.id === id);
    return b ? `${b.nombre}${b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}` : id;
  };

  // ─── panel izquierdo ──────────────────────────────────────────────────────────
  const PanelIzquierdo = () => (
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
            onScanSuccess={handleScanSuccess}
            isProcessing={isLoading}
            onClose={() => setIsCameraOpen(false)}
          />
        )}
      </div>

      {/* Historial sesión */}
      {historial.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#b07c19]" />
            Historial ({historial.length})
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {historial.map((item, idx) => (
              <div
                key={`${item.libro?.id || idx}-${idx}`}
                className="p-2.5 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#252525] truncate">{item.libro?.titulo}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {item.tipo === 'registro' ? 'Registro nuevo' : 'Ingreso'} ·{' '}
                    {item.movimiento?.fecha_movimiento
                      ? new Date(item.movimiento.fecha_movimiento).toLocaleTimeString()
                      : ''}
                  </p>
                </div>
                <span className="font-mono text-[#b07c19] font-bold shrink-0">
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
          <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
            <Barcode className="w-4 h-4 text-[#e19922]" />
            <span>Módulo de Recepción e Inventario</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">
            Registrar Libro en Bodega
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Ingresa o escanea el ISBN para consultar si el libro existe en el sistema. Si no existe, podrás registrarlo manualmente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          {/* Panel derecho */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-5 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-[#e19922]" />
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
                      className="inline-flex items-center gap-1.5 bg-[#e19922] hover:bg-[#b07c19] disabled:opacity-50 text-[#252525] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Consultar
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Puedes teclear el ISBN manualmente o capturarlo con la cámara.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-bold">o</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={handleAgregarManual}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] disabled:opacity-50 text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <PlusCircle className="w-4 h-4 text-[#e19922]" />
                  Agregar manualmente sin ISBN
                </button>
              </div>
            </div>

            {/* Placeholder espera */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#f3f3f3] border border-gray-200 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-[#252525] mb-1">Esperando ISBN</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
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
            <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle className="w-4 h-4 text-[#e19922]" />
              <span>Libro encontrado en catálogo</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">Ingresar Unidades</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] bg-white border border-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Registrar otro
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          <div className="lg:col-span-8 space-y-5">
            {/* Tarjeta del libro */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex gap-4">
                {libroExistente.imagen_url && (
                  <div className="shrink-0">
                    <img
                      src={libroExistente.imagen_url}
                      alt={libroExistente.titulo}
                      className="w-20 h-28 object-cover rounded-xl border border-gray-200 shadow-xs"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#e8c85e] text-[#252525] font-bold">
                      En catálogo
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#252525] leading-snug mb-1 line-clamp-2">
                    {libroExistente.titulo}
                  </h2>
                  {libroExistente.autor_nombre && (
                    <p className="text-sm text-gray-600 mb-0.5 font-medium">{libroExistente.autor_nombre}</p>
                  )}
                  {libroExistente.editorial_nombre && (
                    <p className="text-xs text-gray-400">{libroExistente.editorial_nombre}</p>
                  )}
                  {esAdmin && (
                    <p className="text-xs text-[#b07c19] font-mono font-bold mt-1">
                      Precio: Q{precio.toFixed(2)}
                    </p>
                  )}
                  {libroExistente.isbn && (
                    <p className="text-[10px] text-gray-400 font-mono mt-1 font-medium">ISBN: {libroExistente.isbn}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stock por bodega */}
            {inventarios.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#e19922]" />
                  Stock actual por bodega
                </h3>
                <div className="space-y-2">
                  {inventarios.map(inv => (
                    <div
                      key={inv.bodega_id}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-[#f3f3f3] rounded-xl border border-gray-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#252525]">{inv.bodega_nombre}</span>
                        {inv.sucursal_nombre && (
                          <span className="text-gray-500 ml-1.5">· {inv.sucursal_nombre}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-extrabold ${inv.stock_actual <= inv.stock_minimo ? 'text-amber-600' : 'text-[#252525]'}`}>
                          {inv.stock_actual} uds.
                        </span>
                        <span className="text-gray-400 ml-1">(mín. {inv.stock_minimo})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario ingreso */}
            {!ingresoResultado ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-[#e19922]" />
                  Ingresar Unidades
                </h3>
                <ErrorBox error={errorBox} />
                <form onSubmit={handleIngreso} className="mt-4 space-y-4">
                  <div>
                    <FieldLabel required>Bodega de destino</FieldLabel>
                    {loadingMaestros ? (
                      <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
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
                    className="w-full flex items-center justify-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white disabled:opacity-50 text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <PackagePlus className="w-4 h-4" />
                    {isLoading ? 'Registrando...' : 'Confirmar Ingreso'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#b07c19]" />
                  <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider">
                    Ingreso Registrado
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
                    <p className="text-gray-500 mb-0.5 font-medium">Unidades ingresadas</p>
                    <p className="text-lg font-bold text-[#b07c19]">+{ingresoResultado.movimiento.cantidad}</p>
                  </div>
                  <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
                    <p className="text-gray-500 mb-0.5 font-medium">Stock actual</p>
                    <p className="text-lg font-bold text-[#252525]">{ingresoResultado.inventario.stock_actual}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Bodega: <span className="text-[#252525] font-bold">{bodegaNombrePorId(ingresoResultado.inventario.bodega_id)}</span>
                </p>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
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
    const ramasDerecho = categorias
      .filter(c => c.nombre && c.nombre.toLowerCase().startsWith('derecho'))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const otrasCategorias = categorias
      .filter(c => c.nombre && !c.nombre.toLowerCase().startsWith('derecho'))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const autorValido = regForm.autor.trim() !== '' && regForm.autor.trim() !== AUTOR_PLACEHOLDER;
    const categoriaValida = Boolean(regForm.categoriaId);
    const botonGuardarDeshabilitado = isLoading || !autorValido || !categoriaValida;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Registrando libro..." />}

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
              <AlertCircle className="w-4 h-4 text-[#e19922]" />
              <span>{sugerencia ? 'Sugerencia de Google Books' : 'Libro no encontrado'}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">Registrar Libro Nuevo</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] bg-white border border-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Volver
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <PanelIzquierdo />

          <div className="lg:col-span-8 space-y-5">
            {!sugerencia && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#b07c19]" />
                <span>No se encontró información en Google Books ni Open Library. Completa los datos manualmente.</span>
              </div>
            )}

            {regResultado ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#b07c19]" />
                  <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider">
                    Libro Registrado Exitosamente
                  </h3>
                </div>
                {regResultado.precio_pendiente && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-3 font-medium">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#b07c19]" />
                    <span>El libro quedó pendiente de asignación de precio por el Administrador.</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
                    <p className="text-gray-500 mb-0.5 font-medium">Stock inicial</p>
                    <p className="text-lg font-bold text-[#b07c19]">{regResultado.inventario.stock_actual}</p>
                  </div>
                  <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200">
                    <p className="text-gray-500 mb-0.5 font-medium">Stock mínimo</p>
                    <p className="text-lg font-bold text-[#252525]">{regResultado.inventario.stock_minimo}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-[#252525] mb-1 truncate">{regResultado.libro.titulo}</p>
                <p className="text-xs text-gray-500 mb-4 font-mono">ISBN: {regResultado.libro.isbn || '(sin ISBN)'}</p>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#b07c19] hover:bg-[#f3f3f3] text-gray-700 hover:text-[#252525] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Registrar otro libro
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#e19922]" />
                  Datos del Libro
                </h3>

                <ErrorBox error={errorBox} />

                <form onSubmit={handleRegistrar} className="mt-4 space-y-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Autor</FieldLabel>
                      <Input
                        type="text"
                        value={regForm.autor}
                        onChange={e => {
                          setRegForm(f => ({ ...f, autor: e.target.value }));
                          if (fieldErrors.autor) setFieldErrors(fe => ({ ...fe, autor: null }));
                        }}
                        disabled={isLoading}
                        placeholder="Nombre del autor"
                        className={fieldErrors.autor ? 'border-red-500' : ''}
                      />
                      {fieldErrors.autor && (
                        <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {fieldErrors.autor}
                        </p>
                      )}
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

                  <div>
                    <FieldLabel required>Categoría</FieldLabel>
                    <Select
                      value={regForm.categoriaId}
                      onChange={e => {
                        setRegForm(f => ({ ...f, categoriaId: e.target.value }));
                        if (fieldErrors.categoriaId) setFieldErrors(fe => ({ ...fe, categoriaId: null }));
                      }}
                      disabled={isLoading || loadingMaestros}
                      className={fieldErrors.categoriaId ? 'border-red-500' : ''}
                    >
                      <option value="" disabled>Selecciona una categoría</option>
                      {ramasDerecho.length > 0 && (
                        <optgroup label="Ramas del Derecho" className="font-bold text-gray-700">
                          {ramasDerecho.map(c => (
                            <option key={c.id} value={c.id} className="text-[#252525] font-normal">
                              {c.nombre}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otrasCategorias.length > 0 && (
                        <optgroup label="Otras categorías" className="font-bold text-gray-700">
                          {otrasCategorias.map(c => (
                            <option key={c.id} value={c.id} className="text-[#252525] font-normal">
                              {c.nombre}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </Select>
                    {fieldErrors.categoriaId && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {fieldErrors.categoriaId}
                      </p>
                    )}
                  </div>

                  <div>
                    <FieldLabel required>Reseña</FieldLabel>
                    <textarea
                      value={regForm.resena}
                      onChange={e => setRegForm(f => ({ ...f, resena: e.target.value }))}
                      disabled={isLoading}
                      rows={4}
                      placeholder="Descripción o sinopsis del libro..."
                      className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all placeholder:text-gray-400 disabled:opacity-50 resize-none"
                    />
                  </div>

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
                          className="h-24 rounded-lg border border-gray-200 object-cover shadow-2xs"
                          onError={() => setImgError(true)}
                        />
                      </div>
                    )}
                  </div>

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
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-xs text-gray-500 font-medium">
                        <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
                        El administrador asignará el precio
                      </div>
                    )}
                  </div>

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
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
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
                    disabled={botonGuardarDeshabilitado}
                    className="w-full flex items-center justify-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white disabled:opacity-50 text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
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

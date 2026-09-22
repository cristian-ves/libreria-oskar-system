import React, { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, Layers, AlertTriangle, AlertCircle, Clock,
  ArrowDownRight, Sliders, Search, Filter, X, CheckCircle2,
  ChevronLeft, ChevronRight, Info, DollarSign, Package,
  RefreshCw, BookOpen
} from 'lucide-react';
import { apiFetch } from '../api/client';
import Toast from '../components/Toast';

function formatFecha(dateString) {
  if (!dateString) return 'Sin salidas';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Sin salidas';
  return date.toLocaleString('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TipoBadge({ tipo }) {
  const t = tipo?.toLowerCase();
  const cls =
    t === 'ingreso'
      ? 'bg-[#e19922] text-[#252525]'
      : t === 'salida'
      ? 'bg-red-600 text-white'
      : 'bg-[#b07c19] text-white';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-2xs ${cls}`}>
      {tipo}
    </span>
  );
}

function EstadoBadge({ bajo_stock, obsoleto }) {
  if (bajo_stock) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500 text-[#252525]">
        Bajo stock
      </span>
    );
  }
  if (obsoleto) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-red-600 text-white">
        Obsoleto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#e8c85e] text-[#252525]">
      Normal
    </span>
  );
}

export default function Inventario() {
  const [activeTab, setActiveTab] = useState('existencias');
  const [toast, setToast] = useState(null);

  // ── Datos Maestros & Resumen ──────────────────────────────────────────────
  const [bodegas, setBodegas] = useState([]);
  const [resumen, setResumen] = useState({
    total_unidades: 0,
    titulos_con_stock: 0,
    bajo_stock: 0,
    agotados: 0,
    obsoletos: 0,
    libros_sin_precio: 0,
    alertas_bajo_stock: [],
  });
  const [loadingResumen, setLoadingResumen] = useState(true);

  // ── Pestaña Existencias ───────────────────────────────────────────────────
  const [existencias, setExistencias] = useState([]);
  const [loadingExistencias, setLoadingExistencias] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedBodega, setSelectedBodega] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Pestaña Kardex ────────────────────────────────────────────────────────
  const [movimientos, setMovimientos] = useState([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [kardexTipo, setKardexTipo] = useState('');
  const [kardexBodega, setKardexBodega] = useState('');
  const [kardexLibroId, setKardexLibroId] = useState(null);
  const [kardexLibroTitulo, setKardexLibroTitulo] = useState('');
  const [kardexOffset, setKardexOffset] = useState(0);
  const KARDEX_LIMIT = 25;

  // ── Modales ───────────────────────────────────────────────────────────────
  const [modalSalidaOpen, setModalSalidaOpen] = useState(false);
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formCantidad, setFormCantidad] = useState(1);
  const [formMotivo, setFormMotivo] = useState('');
  const [formStockNuevo, setFormStockNuevo] = useState(0);
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Cargar Resumen y Bodegas ──────────────────────────────────────────────
  const cargarResumen = useCallback(async () => {
    try {
      setLoadingResumen(true);
      const res = await apiFetch('/api/inventario/resumen');
      if (res.ok) {
        const json = await res.json();
        setResumen(json.data || {});
      }
    } catch (err) {
      console.error('[RESUMEN ERROR]:', err);
    } finally {
      setLoadingResumen(false);
    }
  }, []);

  const cargarBodegas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/bodegas');
      if (res.ok) {
        const json = await res.json();
        setBodegas(json.data || []);
      }
    } catch (err) {
      console.error('[BODEGAS ERROR]:', err);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    cargarBodegas();
  }, [cargarResumen, cargarBodegas]);

  // ── Cargar Existencias ────────────────────────────────────────────────────
  const cargarExistencias = useCallback(async () => {
    try {
      setLoadingExistencias(true);
      const params = new URLSearchParams();
      if (estadoFilter && estadoFilter !== 'todos') {
        params.set('estado', estadoFilter);
      }
      if (debouncedQ.trim()) {
        params.set('q', debouncedQ.trim());
      }
      if (selectedBodega) {
        params.set('bodegaId', selectedBodega);
      }

      const res = await apiFetch(`/api/inventario?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExistencias(json.data || []);
      } else {
        setExistencias([]);
      }
    } catch (err) {
      console.error('[EXISTENCIAS ERROR]:', err);
      setExistencias([]);
    } finally {
      setLoadingExistencias(false);
    }
  }, [estadoFilter, debouncedQ, selectedBodega]);

  useEffect(() => {
    if (activeTab === 'existencias') {
      cargarExistencias();
    }
  }, [activeTab, cargarExistencias]);

  // ── Cargar Kardex ─────────────────────────────────────────────────────────
  const cargarKardex = useCallback(async () => {
    try {
      setLoadingKardex(true);
      const params = new URLSearchParams();
      params.set('limit', String(KARDEX_LIMIT));
      params.set('offset', String(kardexOffset));

      if (kardexTipo) params.set('tipo', kardexTipo);
      if (kardexBodega) params.set('bodegaId', kardexBodega);
      if (kardexLibroId) params.set('libroId', kardexLibroId);

      const res = await apiFetch(`/api/movimientos?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setMovimientos(data.movimientos || []);
        setTotalMovimientos(data.total || 0);
      } else {
        setMovimientos([]);
        setTotalMovimientos(0);
      }
    } catch (err) {
      console.error('[KARDEX ERROR]:', err);
      setMovimientos([]);
      setTotalMovimientos(0);
    } finally {
      setLoadingKardex(false);
    }
  }, [kardexOffset, kardexTipo, kardexBodega, kardexLibroId]);

  useEffect(() => {
    if (activeTab === 'kardex') {
      cargarKardex();
    }
  }, [activeTab, cargarKardex]);

  // ── Handlers de Modales ───────────────────────────────────────────────────
  const abrirModalSalida = (item) => {
    setSelectedItem(item);
    setFormCantidad(1);
    setFormMotivo('');
    setModalError(null);
    setModalSalidaOpen(true);
  };

  const abrirModalAjuste = (item) => {
    setSelectedItem(item);
    setFormStockNuevo(item.stock_actual);
    setFormMotivo('');
    setModalError(null);
    setModalAjusteOpen(true);
  };

  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalError(null);

    const cantidad = Number(formCantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setModalError({ message: 'La cantidad debe ser un número entero mayor o igual a 1.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/inventario/${selectedItem.inventario_id}/salida`, {
        method: 'POST',
        body: JSON.stringify({
          cantidad,
          motivo: formMotivo.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError({
          message: json.message || 'Error al procesar la salida.',
          details: json.details,
        });
        return;
      }

      setModalSalidaOpen(false);
      setToast({
        type: 'success',
        title: '¡Salida Registrada!',
        bookTitle: selectedItem.titulo,
        message: `Se descontaron ${cantidad} uds. Stock actual: ${json.data?.inventario?.stock_actual} uds.`,
      });

      cargarExistencias();
      cargarResumen();
    } catch (err) {
      setModalError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAjusteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalError(null);

    const stockNuevo = Number(formStockNuevo);
    if (!Number.isInteger(stockNuevo) || stockNuevo < 0) {
      setModalError({ message: 'El stock nuevo debe ser un número entero mayor o igual a 0.' });
      return;
    }

    if (!formMotivo.trim()) {
      setModalError({ message: 'El motivo del ajuste es obligatorio.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/inventario/${selectedItem.inventario_id}/ajuste`, {
        method: 'POST',
        body: JSON.stringify({
          stockNuevo,
          motivo: formMotivo.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setModalError({
          message: json.message || 'Error al procesar el ajuste.',
          details: json.details,
        });
        return;
      }

      setModalAjusteOpen(false);
      setToast({
        type: 'success',
        title: '¡Ajuste de Stock Aplicado!',
        bookTitle: selectedItem.titulo,
        message: `Stock fijado en ${json.data?.inventario?.stock_actual} uds. (Anterior: ${json.data?.stock_anterior}).`,
      });

      cargarExistencias();
      cargarResumen();
    } catch (err) {
      setModalError({ message: err.message || 'Error de conexión con el servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerKardex = (item) => {
    setKardexLibroId(item.libro_id);
    setKardexLibroTitulo(item.titulo);
    setKardexOffset(0);
    setActiveTab('kardex');
  };

  const limpiarFiltroLibroKardex = () => {
    setKardexLibroId(null);
    setKardexLibroTitulo('');
    setKardexOffset(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Encabezado principal */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
          <Warehouse className="w-4 h-4 text-[#e19922]" />
          <span>Control de Existencias y Auditoría</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">
          Inventario y Kardex
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Supervisión en tiempo real de existencias por bodega, control de mermas, alertas de desabastecimiento y trazabilidad completa de movimientos.
        </p>
      </div>

      {/* ── 1. Panel Superior de Alertas y Métricas (Cards blancas con elevación suave) ── */}
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Total Unidades */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Total Unidades</span>
              <Layers className="w-4 h-4 text-[#b07c19]" />
            </div>
            <p className="text-2xl font-extrabold text-[#252525] font-mono">
              {loadingResumen ? '...' : resumen.total_unidades.toLocaleString()}
            </p>
            <span className="text-[11px] text-gray-500 mt-1 font-medium">
              {resumen.titulos_con_stock} títulos con stock
            </span>
          </div>

          {/* Bajo Stock */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('existencias');
              setEstadoFilter('bajo_stock');
            }}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold group-hover:text-amber-600 transition-colors">Bajo Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 font-mono">
              {loadingResumen ? '...' : resumen.bajo_stock}
            </p>
            <span className="text-[11px] text-gray-500 group-hover:text-amber-600 transition-colors font-medium">
              Filtrar en existencias →
            </span>
          </button>

          {/* Agotados */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('existencias');
              setEstadoFilter('todos');
            }}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold group-hover:text-red-600 transition-colors">Agotados</span>
              <Package className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-extrabold text-red-600 font-mono">
              {loadingResumen ? '...' : resumen.agotados}
            </p>
            <span className="text-[11px] text-gray-500 group-hover:text-red-600 transition-colors font-medium">
              Stock en 0 unidades
            </span>
          </button>

          {/* Obsoletos */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('existencias');
              setEstadoFilter('obsoleto');
            }}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold group-hover:text-gray-900 transition-colors">Obsoletos</span>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-2xl font-extrabold text-[#252525] font-mono">
              {loadingResumen ? '...' : resumen.obsoletos}
            </p>
            <span className="text-[11px] text-gray-500 group-hover:text-[#252525] transition-colors font-medium">
              Sin rotación reciente →
            </span>
          </button>

          {/* Libros sin precio */}
          <div className="col-span-2 sm:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Sin Precio</span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-extrabold text-gray-600 font-mono">
              {loadingResumen ? '...' : resumen.libros_sin_precio}
            </p>
            <span className="text-[11px] text-gray-500 font-medium">
              Pendientes de precio
            </span>
          </div>
        </div>

        {/* Lista de Alertas Críticas de Bajo Stock */}
        {resumen.alertas_bajo_stock && resumen.alertas_bajo_stock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Alertas Críticas de Bajo Stock ({resumen.alertas_bajo_stock.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {resumen.alertas_bajo_stock.map((alerta, idx) => (
                <div
                  key={`${alerta.titulo}-${alerta.bodega_nombre}-${idx}`}
                  className="bg-white border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#252525] truncate">{alerta.titulo}</p>
                    <p className="text-[11px] text-gray-500">{alerta.bodega_nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-700">
                      {alerta.stock_actual}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono"> / {alerta.stock_minimo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Pestañas de Navegación ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('existencias')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'existencias'
              ? 'border-[#e19922] text-[#252525] bg-white shadow-2xs'
              : 'border-transparent text-gray-500 hover:text-[#252525]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#b07c19]" />
          <span>Existencias</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kardex')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'kardex'
              ? 'border-[#e19922] text-[#252525] bg-white shadow-2xs'
              : 'border-transparent text-gray-500 hover:text-[#252525]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#b07c19]" />
          <span>Kardex de Movimientos</span>
        </button>
      </div>

      {/* ── 3. Contenido: Existencias ─────────────────────────────────────────── */}
      {activeTab === 'existencias' && (
        <div className="space-y-5">
          {/* Barra de Filtros */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Chips de estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'en_stock', label: 'En stock' },
                { id: 'bajo_stock', label: 'Bajo stock' },
                { id: 'obsoleto', label: 'Obsoleto' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setEstadoFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    estadoFilter === chip.id
                      ? 'bg-[#e19922] text-[#252525] shadow-xs'
                      : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Buscador y Dropdown de Bodega */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar título, autor, ISBN..."
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl pl-9 pr-3.5 py-2 outline-none focus:border-[#b07c19] transition-all placeholder:text-gray-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#252525]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedBodega}
                onChange={(e) => setSelectedBodega(e.target.value)}
                className="w-full sm:w-52 bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#b07c19] transition-all cursor-pointer font-medium"
              >
                <option value="">Todas las bodegas</option>
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} {b.sucursal_nombre ? `(${b.sucursal_nombre})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Listado de Existencias */}
          {loadingExistencias ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500 font-medium">Cargando existencias...</p>
            </div>
          ) : existencias.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#252525] mb-1">No se encontraron existencias</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No hay registros que coincidan con los filtros aplicados.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla para pantallas grandes */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4">Libro / Detalles</th>
                      <th className="py-3.5 px-4">Bodega / Sucursal</th>
                      <th className="py-3.5 px-4 text-center">Stock</th>
                      <th className="py-3.5 px-4">Última Salida</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {existencias.map((item) => (
                      <tr key={item.inventario_id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.imagen_url ? (
                              <img
                                src={item.imagen_url}
                                alt={item.titulo}
                                className="w-9 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-9 h-12 rounded-lg bg-[#f3f3f3] border border-gray-200 flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-[#252525] truncate max-w-xs">{item.titulo}</p>
                              <p className="text-[11px] text-gray-500 truncate max-w-xs">{item.autor || 'Autor desconocido'}</p>
                              {item.isbn && (
                                <p className="text-[10px] font-mono text-gray-400 font-medium">ISBN: {item.isbn}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#252525]">{item.bodega_nombre}</p>
                          <p className="text-[11px] text-gray-500">{item.sucursal_nombre || 'Sucursal Principal'}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono text-sm font-extrabold ${
                            item.stock_actual <= item.stock_minimo ? 'text-amber-600' : 'text-[#252525]'
                          }`}>
                            {item.stock_actual}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono"> / mín {item.stock_minimo}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                          {formatFecha(item.ultima_salida)}
                        </td>
                        <td className="py-3 px-4">
                          <EstadoBadge bajo_stock={item.bajo_stock} obsoleto={item.obsoleto} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirModalSalida(item)}
                              title="Registrar salida"
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                            >
                              Salida
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirModalAjuste(item)}
                              title="Ajustar stock"
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#b07c19] text-white hover:bg-[#e19922] hover:text-[#252525] transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                            >
                              Ajuste
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerKardex(item)}
                              title="Ver historial de movimientos"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#f3f3f3] text-[#252525] hover:bg-gray-200 border border-gray-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                            >
                              Kardex
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas apiladas para móvil */}
              <div className="md:hidden space-y-3">
                {existencias.map((item) => (
                  <div
                    key={item.inventario_id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3"
                  >
                    <div className="flex gap-3">
                      {item.imagen_url && (
                        <img
                          src={item.imagen_url}
                          alt={item.titulo}
                          className="w-12 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-[#252525] text-sm leading-snug line-clamp-2">{item.titulo}</h4>
                        <p className="text-xs text-gray-500 truncate">{item.autor || 'Autor desconocido'}</p>
                        <p className="text-[11px] font-mono text-gray-400">{item.bodega_nombre} · {item.sucursal_nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <div>
                        <span className="text-gray-500 font-medium">Stock: </span>
                        <span className={`font-mono font-bold ${
                          item.stock_actual <= item.stock_minimo ? 'text-amber-600' : 'text-[#252525]'
                        }`}>
                          {item.stock_actual}
                        </span>
                        <span className="text-gray-400 font-mono"> (mín {item.stock_minimo})</span>
                      </div>
                      <EstadoBadge bajo_stock={item.bajo_stock} obsoleto={item.obsoleto} />
                    </div>

                    <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between">
                      <span>Última salida:</span>
                      <span>{formatFecha(item.ultima_salida)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => abrirModalSalida(item)}
                        className="py-1.5 text-center text-xs font-bold rounded-xl bg-red-600 text-white active:scale-95 transition-all"
                      >
                        Salida
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalAjuste(item)}
                        className="py-1.5 text-center text-xs font-bold rounded-xl bg-[#b07c19] text-white active:scale-95 transition-all"
                      >
                        Ajuste
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerKardex(item)}
                        className="py-1.5 text-center text-xs font-semibold rounded-xl bg-[#f3f3f3] text-[#252525] border border-gray-200 active:scale-95 transition-all"
                      >
                        Kardex
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 4. Contenido: Kardex ─────────────────────────────────────────────── */}
      {activeTab === 'kardex' && (
        <div className="space-y-5">
          {/* Banner filtrado por libro */}
          {kardexLibroId && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#b07c19]" />
                <span>
                  Filtrado por libro: <strong className="text-[#252525] font-bold">{kardexLibroTitulo}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={limpiarFiltroLibroKardex}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-red-600 bg-white px-2.5 py-1 rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs font-semibold"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar filtro</span>
              </button>
            </div>
          )}

          {/* Barra de Filtros de Kardex */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Chips de tipo */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: '', label: 'Todos' },
                { id: 'Ingreso', label: 'Ingresos' },
                { id: 'Salida', label: 'Salidas' },
                { id: 'Ajuste', label: 'Ajustes' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setKardexTipo(chip.id);
                    setKardexOffset(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    kardexTipo === chip.id
                      ? 'bg-[#e19922] text-[#252525] shadow-xs'
                      : 'bg-[#f3f3f3] text-[#252525] hover:bg-[#b07c19] hover:text-white border border-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Dropdown de Bodega */}
            <select
              value={kardexBodega}
              onChange={(e) => {
                setKardexBodega(e.target.value);
                setKardexOffset(0);
              }}
              className="w-full sm:w-56 bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#b07c19] transition-all cursor-pointer font-medium"
            >
              <option value="">Todas las bodegas</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre} {b.sucursal_nombre ? `(${b.sucursal_nombre})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de Movimientos */}
          {loadingKardex ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#e19922] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500 font-medium">Cargando movimientos del kardex...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#252525] mb-1">No hay movimientos registrados</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No se encontraron registros en el kardex con los filtros aplicados.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla desktop */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f3f3f3] text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4">Fecha / Hora</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4 text-center">Cantidad</th>
                      <th className="py-3.5 px-4">Libro</th>
                      <th className="py-3.5 px-4">Bodega</th>
                      <th className="py-3.5 px-4">Operador</th>
                      <th className="py-3.5 px-4">Motivo / Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {formatFecha(m.fecha_movimiento)}
                        </td>
                        <td className="py-3 px-4">
                          <TipoBadge tipo={m.tipo} />
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-extrabold text-[#252525] text-sm">
                          {m.tipo?.toLowerCase() === 'salida' ? `-${m.cantidad}` : `+${m.cantidad}`}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#252525] truncate max-w-xs">{m.titulo}</p>
                          {m.isbn && <p className="text-[10px] font-mono text-gray-400 font-medium">ISBN: {m.isbn}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#252525]">{m.bodega_nombre}</p>
                          <p className="text-[10px] text-gray-500">{m.sucursal_nombre}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-medium">
                          {m.usuario_nombre || 'Sistema'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate text-[11px]">
                          {m.motivo_detalle || 'Sin detalle'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas móvil */}
              <div className="md:hidden space-y-3">
                {movimientos.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <TipoBadge tipo={m.tipo} />
                      <span className="font-mono text-xs text-gray-500">
                        {formatFecha(m.fecha_movimiento)}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#252525] text-sm leading-snug">{m.titulo}</h4>
                      <p className="text-[11px] font-mono text-gray-500">{m.bodega_nombre} · Cantidad: <strong className="text-[#252525]">{m.cantidad}</strong></p>
                    </div>

                    {m.motivo_detalle && (
                      <p className="text-xs text-gray-600 bg-[#f3f3f3] p-2 rounded-xl border border-gray-200">
                        {m.motivo_detalle}
                      </p>
                    )}

                    <div className="text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-100 flex justify-between">
                      <span>Operador: {m.usuario_nombre || 'Sistema'}</span>
                      {m.isbn && <span>ISBN: {m.isbn}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-gray-500 font-medium">
                  Mostrando{' '}
                  <strong className="text-[#252525]">
                    {totalMovimientos === 0 ? 0 : kardexOffset + 1}
                  </strong>
                  –
                  <strong className="text-[#252525]">
                    {Math.min(kardexOffset + KARDEX_LIMIT, totalMovimientos)}
                  </strong>{' '}
                  de <strong className="text-[#252525]">{totalMovimientos}</strong> movimientos
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKardexOffset((prev) => Math.max(0, prev - KARDEX_LIMIT))}
                    disabled={kardexOffset === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:text-[#252525] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKardexOffset((prev) => prev + KARDEX_LIMIT)}
                    disabled={kardexOffset + KARDEX_LIMIT >= totalMovimientos}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-[#f3f3f3] text-gray-700 hover:text-[#252525] hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-semibold"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal de Salida ──────────────────────────────────────────────────── */}
      {modalSalidaOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#252525] flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  Registrar Salida de Mercancía
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bodega: {selectedItem.bodega_nombre} ({selectedItem.sucursal_nombre})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalSalidaOpen(false)}
                className="text-gray-400 hover:text-[#252525] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha del libro */}
            <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-[#252525] truncate">{selectedItem.titulo}</p>
                <p className="text-gray-500 text-[11px] truncate">{selectedItem.autor || 'Autor no especificado'}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Stock actual</span>
                <span className="text-sm font-extrabold font-mono text-[#252525]">{selectedItem.stock_actual} uds.</span>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">{modalError.message}</p>
                  {Array.isArray(modalError.details) && modalError.details.length > 0 && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-600">
                      {modalError.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSalidaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#252525] mb-1.5">
                  Cantidad a retirar <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedItem.stock_actual}
                  value={formCantidad}
                  onChange={(e) => setFormCantidad(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-red-600 transition-all font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#252525] mb-1.5">
                  Motivo de la salida (opcional)
                </label>
                <input
                  type="text"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ej. Venta en mostrador, despacho a cliente..."
                  disabled={isSubmitting}
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalSalidaOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[#252525] bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Ajuste ──────────────────────────────────────────────────── */}
      {modalAjusteOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#252525] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#b07c19]" />
                  Ajuste de Stock / Auditoría
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Bodega: {selectedItem.bodega_nombre} ({selectedItem.sucursal_nombre})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAjusteOpen(false)}
                className="text-gray-400 hover:text-[#252525] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha del libro */}
            <div className="p-3 bg-[#f3f3f3] rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-[#252525] truncate">{selectedItem.titulo}</p>
                <p className="text-gray-500 text-[11px] truncate">{selectedItem.autor || 'Autor no especificado'}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">Stock actual</span>
                <span className="text-sm font-extrabold font-mono text-[#252525]">{selectedItem.stock_actual} uds.</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#b07c19] shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                Este ajuste <strong className="text-[#252525]">FIJA</strong> el stock al valor que ingreses a continuación (establece el nuevo conteo físico, no suma ni resta).
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">{modalError.message}</p>
                  {Array.isArray(modalError.details) && modalError.details.length > 0 && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-600">
                      {modalError.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleAjusteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#252525] mb-1.5">
                  Stock Nuevo (conteo físico auditado) <span className="text-[#b07c19]">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={formStockNuevo}
                  onChange={(e) => setFormStockNuevo(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#252525] mb-1.5">
                  Motivo o justificación del ajuste <span className="text-[#b07c19]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  required
                  placeholder="Ej. Conteo físico anual de inventario, merma por ejemplar dañado, corrección..."
                  disabled={isSubmitting}
                  className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] transition-all placeholder:text-gray-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalAjusteOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[#252525] bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Aplicando...' : 'Fijar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, Warehouse, X } from 'lucide-react';
import ErrorBox from '../components/ui/ErrorBox';
import Modal from '../components/ui/Modal';
import FormularioSucursal from '../features/sucursales/components/FormularioSucursal';
import FormularioBodega from '../features/sucursales/components/FormularioBodega';
import TablaSucursales from '../features/sucursales/components/TablaSucursales';
import TablaBodegas from '../features/sucursales/components/TablaBodegas';
import useSucursales from '../features/sucursales/hooks/useSucursales';
import {
  actualizarBodega, actualizarSucursal, cambiarEstadoBodega, cambiarEstadoSucursal,
  crearBodega, crearSucursal, getBodegasSucursal,
} from '../services/api/sucursales.api';

async function leer(response, fallback) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.status !== 'success') {
    const error = new Error(json.message || fallback);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json.data;
}

export default function Sucursales() {
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const { sucursales, cargando, error, cargar } = useSucursales({ estado, busqueda });
  const [seleccionada, setSeleccionada] = useState(null);
  const [bodegas, setBodegas] = useState([]);
  const [cargandoBodegas, setCargandoBodegas] = useState(false);
  const [errorBodegas, setErrorBodegas] = useState(null);
  const [formSucursal, setFormSucursal] = useState(null);
  const [formBodega, setFormBodega] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesandoEstado, setProcesandoEstado] = useState(false);

  const cargarBodegas = useCallback(async (sucursalId) => {
    if (!sucursalId) return;
    setCargandoBodegas(true);
    setErrorBodegas(null);
    try { setBodegas(await leer(await getBodegasSucursal(sucursalId), 'No se pudieron cargar las bodegas.')); }
    catch (err) { setErrorBodegas({ message: err.message, status: err.status, details: err.details }); }
    finally { setCargandoBodegas(false); }
  }, []);

  useEffect(() => { if (seleccionada) cargarBodegas(seleccionada.id); }, [seleccionada?.id, cargarBodegas]);
  const resumen = useMemo(() => ({
    total: sucursales.length,
    activas: sucursales.filter((item) => item.activo).length,
    bodegas: sucursales.reduce((total, item) => total + (item.bodegas?.length || 0), 0),
  }), [sucursales]);

  const guardarSucursal = async (payload) => {
    setGuardando(true); setErrorOperacion(null); setMensaje('');
    try {
      await leer(formSucursal?.id
        ? await actualizarSucursal(formSucursal.id, payload)
        : await crearSucursal(payload), 'No se pudo guardar la sucursal.');
      setFormSucursal(null); setMensaje(formSucursal?.id ? 'Sucursal actualizada.' : 'Sucursal creada.');
      await cargar({ silencioso: true });
      if (seleccionada?.id === formSucursal?.id) setSeleccionada((prev) => ({ ...prev, ...payload }));
      return true;
    } catch (err) { setErrorOperacion({ message: err.message, status: err.status, details: err.details }); return false; }
    finally { setGuardando(false); }
  };

  const guardarBodega = async (payload) => {
    setGuardando(true); setErrorOperacion(null); setMensaje('');
    try {
      await leer(formBodega?.id
        ? await actualizarBodega(formBodega.id, payload)
        : await crearBodega(seleccionada.id, payload), 'No se pudo guardar la bodega.');
      setFormBodega(null); setMensaje(formBodega?.id ? 'Bodega actualizada.' : 'Bodega creada.');
      await cargarBodegas(seleccionada.id); await cargar({ silencioso: true });
      return true;
    } catch (err) { setErrorOperacion({ message: err.message, status: err.status, details: err.details }); return false; }
    finally { setGuardando(false); }
  };

  const solicitarEstado = (tipo, item) => { setErrorOperacion(null); setConfirmacion({ tipo, item, activo: !item.activo }); };
  const cambiarEstado = async () => {
    if (!confirmacion || procesandoEstado) return;
    setProcesandoEstado(true); setErrorOperacion(null); setMensaje('');
    try {
      const { tipo, item, activo } = confirmacion;
      const response = tipo === 'sucursal'
        ? await cambiarEstadoSucursal(item.id, activo)
        : await cambiarEstadoBodega(item.id, activo);
      await leer(response, `No se pudo ${activo ? 'activar' : 'desactivar'} el registro.`);
      setConfirmacion(null);
      setMensaje(`${tipo === 'sucursal' ? 'Sucursal' : 'Bodega'} ${activo ? 'activada' : 'desactivada'} correctamente.`);
      await cargar({ silencioso: true });
      if (seleccionada) {
        if (tipo === 'sucursal' && seleccionada.id === item.id) setSeleccionada((prev) => ({ ...prev, activo }));
        await cargarBodegas(seleccionada.id);
      }
    } catch (err) { setErrorOperacion({ message: err.message, status: err.status, details: err.details }); }
    finally { setProcesandoEstado(false); }
  };

  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b07c19]"><Building2 aria-hidden="true" className="h-4 w-4" />Administración</div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#252525] sm:text-3xl">Sucursales y bodegas</h1>
        <p className="mt-1 text-sm text-gray-500">Administra ubicaciones y conserva sus registros históricos.</p></div>
      <button type="button" onClick={() => { setErrorOperacion(null); setFormSucursal({}); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#e19922] px-4 py-2.5 text-sm font-bold text-[#252525] shadow-sm hover:bg-[#b07c19] hover:text-white"><Plus aria-hidden="true" className="h-4 w-4" />Nueva sucursal</button>
    </header>

    {mensaje && <div role="status" aria-live="polite" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><span>{mensaje}</span><button type="button" onClick={() => setMensaje('')} aria-label="Cerrar mensaje" className="min-h-11 min-w-11 rounded-lg hover:bg-emerald-100"><X aria-hidden="true" className="mx-auto h-4 w-4" /></button></div>}
    <ErrorBox error={errorOperacion} />

    <section aria-label="Resumen de sucursales" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[['Sucursales', resumen.total], ['Activas', resumen.activas], ['Bodegas asociadas', resumen.bodegas]].map(([label, value]) => <article key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-[#252525]">{value}</p></article>)}
    </section>

    <section aria-label="Buscar y filtrar sucursales" className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_12rem]">
      <label className="block"><span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600"><Search aria-hidden="true" className="h-4 w-4" />Buscar sucursal</span><input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre…" className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e19922]" /></label>
      <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e19922]"><option value="">Todas</option><option value="true">Activas</option><option value="false">Inactivas</option></select></label>
    </section>
    <p role="status" aria-live="polite" className="mb-3 text-xs text-gray-500">{cargando ? 'Actualizando listado…' : `${sucursales.length} sucursales`}</p>
    <TablaSucursales rows={sucursales} cargando={cargando} error={error} onDetalle={setSeleccionada} onEditar={(row) => { setErrorOperacion(null); setFormSucursal(row); }} onEstado={(row) => solicitarEstado('sucursal', row)} onReintentar={() => cargar()} />

    {seleccionada && <section aria-labelledby="titulo-bodegas-sucursal" className="mt-7 space-y-4 rounded-2xl border border-gray-200 bg-[#fafafa] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#b07c19]"><Warehouse aria-hidden="true" className="h-4 w-4" />Bodegas asociadas</div><h2 id="titulo-bodegas-sucursal" className="mt-1 text-xl font-extrabold text-[#252525]">{seleccionada.nombre}</h2><p className="mt-1 text-sm text-gray-500">{seleccionada.direccion}</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => setSeleccionada(null)} className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold">Cerrar</button><button type="button" disabled={!seleccionada.activo} onClick={() => { setErrorOperacion(null); setFormBodega({}); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e19922] px-4 text-sm font-bold disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />Nueva bodega</button></div>
      </div>
      {errorBodegas ? <ErrorBox error={errorBodegas} /> : cargandoBodegas ? <p role="status" className="py-6 text-center text-sm text-gray-500">Cargando bodegas…</p> : <TablaBodegas bodegas={bodegas} onEditar={(row) => { setErrorOperacion(null); setFormBodega(row); }} onEstado={(row) => solicitarEstado('bodega', row)} />}
    </section>}

    {formSucursal && <FormularioSucursal sucursal={formSucursal.id ? formSucursal : null} guardando={guardando} error={errorOperacion} onClose={() => !guardando && setFormSucursal(null)} onGuardar={guardarSucursal} />}
    {formBodega && <FormularioBodega bodega={formBodega.id ? formBodega : null} guardando={guardando} error={errorOperacion} onClose={() => !guardando && setFormBodega(null)} onGuardar={guardarBodega} />}
    {confirmacion && <Modal><section role="alertdialog" aria-modal="true" aria-labelledby="titulo-confirmar-estado" aria-describedby="texto-confirmar-estado" className="space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h2 id="titulo-confirmar-estado" className="text-lg font-extrabold text-[#252525]">{confirmacion.activo ? 'Reactivar' : 'Desactivar'} {confirmacion.tipo}</h2><p className="mt-1 text-sm text-gray-500">{confirmacion.item.nombre}</p></div><button type="button" disabled={procesandoEstado} onClick={() => setConfirmacion(null)} aria-label="Cerrar confirmación" className="min-h-11 min-w-11"><X aria-hidden="true" className="mx-auto h-5 w-5" /></button></div>
      <p id="texto-confirmar-estado" className="text-sm text-gray-600">{confirmacion.tipo === 'bodega' && !confirmacion.activo ? 'Solo se puede desactivar si no quedan existencias positivas. El Kardex y las ventas históricas se conservarán.' : confirmacion.tipo === 'sucursal' && !confirmacion.activo ? 'Primero desactiva sus bodegas y resuelve existencias pendientes. Los datos históricos se conservarán.' : '¿Confirmas el cambio de estado?'}</p>
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end"><button type="button" disabled={procesandoEstado} onClick={() => setConfirmacion(null)} className="min-h-11 rounded-xl border border-gray-200 bg-gray-100 px-4 text-sm font-semibold">Cancelar</button><button type="button" disabled={procesandoEstado} onClick={cambiarEstado} className="min-h-11 rounded-xl bg-[#e19922] px-4 text-sm font-bold disabled:opacity-50">{procesandoEstado ? 'Procesando…' : 'Confirmar'}</button></div>
    </section></Modal>}
  </div>;
}

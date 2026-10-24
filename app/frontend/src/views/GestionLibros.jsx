import { useState } from 'react';
import { CircleCheck, ShieldCheck, X } from 'lucide-react';
import ErrorBox from '../components/ui/ErrorBox';
import Modal from '../components/ui/Modal';
import Paginacion from '../components/ui/Paginacion';
import FiltrosGestionLibros from '../features/libros/components/FiltrosGestionLibros';
import FormularioEditarLibro from '../features/libros/components/FormularioEditarLibro';
import TablaGestionLibros from '../features/libros/components/TablaGestionLibros';
import useGestionLibros from '../features/libros/hooks/useGestionLibros';

export default function GestionLibros() {
  const [errorConfirmacion, setErrorConfirmacion] = useState(null);
  const {
    libros, categorias, total, limit, pagina, busqueda, setBusqueda, categoriaId, setCategoriaId,
    estado, setEstado, cargando, cargandoCategorias, guardando, errorCarga, errorCategorias, errorOperacion, mensaje,
    libroEditando, setLibroEditando, libroPendienteEstado, setLibroPendienteEstado,
    guardar, cambiarEstado, confirmarCambioEstado, recargar, cambiarPagina, cambiarLimit,
    limpiarMensaje, limpiarErrorOperacion,
  } = useGestionLibros();

  const abrirEdicion = (libro) => { limpiarErrorOperacion(); setLibroEditando(libro); };
  const abrirCambioEstado = (libro) => {
    limpiarErrorOperacion(); setErrorConfirmacion(null);
    if (!libro.activo) { void cambiarEstado(libro); return; }
    setLibroPendienteEstado(libro);
  };
  const confirmarEstado = async () => { setErrorConfirmacion(errorOperacion); await confirmarCambioEstado(); };
  const cerrarEstado = () => { if (!guardando) { setLibroPendienteEstado(null); setErrorConfirmacion(null); limpiarErrorOperacion(); } };
  const limpiarFiltros = () => { setBusqueda(''); setCategoriaId(''); setEstado('todos'); };

  return <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <header className="mb-6">
      <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1"><ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#e19922]" /><span>Administración</span></div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">Gestión de libros</h1>
      <p className="mt-1 text-sm text-gray-500">Edita los datos bibliográficos y administra la disponibilidad en el catálogo.</p>
    </header>

    {mensaje && <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" aria-live="polite"><CircleCheck aria-hidden="true" className="w-5 h-5 shrink-0" /><p className="flex-1">{mensaje}</p><button type="button" onClick={limpiarMensaje} aria-label="Cerrar confirmación" className="rounded p-0.5 hover:bg-emerald-100"><X aria-hidden="true" className="w-4 h-4" /></button></div>}
    {errorOperacion && !libroEditando && !libroPendienteEstado && <div className="mb-4"><ErrorBox error={errorOperacion} /></div>}

    <div className="space-y-4">
      {errorCategorias && <ErrorBox error={errorCategorias} />}
      <FiltrosGestionLibros busqueda={busqueda} setBusqueda={setBusqueda} categoriaId={categoriaId} setCategoriaId={setCategoriaId} estado={estado} setEstado={setEstado} categorias={categorias} />
      <div className="flex items-center justify-between gap-3 text-xs text-gray-500"><span role="status" aria-live="polite">{cargando ? 'Actualizando listado...' : `${total} ${total === 1 ? 'libro encontrado' : 'libros encontrados'}`}</span>{(busqueda || categoriaId || estado !== 'todos') && <button type="button" onClick={limpiarFiltros} className="font-bold text-[#8a5b08] hover:underline">Limpiar filtros</button>}</div>
      {cargandoCategorias && <p className="sr-only" role="status">Cargando categorías...</p>}
      <TablaGestionLibros libros={libros} total={total} cargando={cargando} error={errorCarga} guardando={guardando} onEditar={abrirEdicion} onCambiarEstado={abrirCambioEstado} onReintentar={recargar} />
      {!errorCarga && total > 0 && <Paginacion paginaActual={pagina} totalResultados={total} tamanoPagina={limit} opcionesTamano={[20, 50, 100]} onCambiarPagina={cambiarPagina} onCambiarTamano={cambiarLimit} cargando={cargando} etiquetaResultados="libros" />}
    </div>

    {libroEditando && <FormularioEditarLibro key={libroEditando.id} libro={libroEditando} categorias={categorias} guardando={guardando} error={errorOperacion} onClose={() => { if (!guardando) { setLibroEditando(null); limpiarErrorOperacion(); } }} onGuardar={guardar} />}
    {libroPendienteEstado && <Modal><section role="alertdialog" aria-modal="true" aria-labelledby="confirmar-estado-libro" aria-describedby="descripcion-estado-libro" className="space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h2 id="confirmar-estado-libro" className="text-lg font-extrabold text-[#252525]">Desactivar libro</h2><p className="mt-1 text-xs text-gray-500 break-words">{libroPendienteEstado.titulo}</p></div><button type="button" onClick={cerrarEstado} disabled={guardando} aria-label="Cerrar confirmación" className="p-1 text-gray-400 hover:text-[#252525] disabled:opacity-40"><X aria-hidden="true" className="w-5 h-5" /></button></div>
      {(errorOperacion || errorConfirmacion) && <ErrorBox error={errorOperacion || errorConfirmacion} />}
      <p id="descripcion-estado-libro" className="text-sm text-gray-600">El libro dejará de aparecer en el catálogo y no podrá venderse, pero conservará su inventario e historial.</p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100"><button type="button" onClick={cerrarEstado} disabled={guardando} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button><button type="button" onClick={confirmarEstado} disabled={guardando} className="min-h-11 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{guardando ? 'Desactivando...' : 'Confirmar desactivación'}</button></div>
    </section></Modal>}
  </div>;
}

import { useState } from 'react';
import { CircleCheck, FolderPlus, Search, Tags, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ErrorBox from '../components/ui/ErrorBox';
import FieldLabel from '../components/ui/FieldLabel';
import Input from '../components/ui/Input';
import FormularioCategoria from '../features/categorias/components/FormularioCategoria';
import TablaCategorias from '../features/categorias/components/TablaCategorias';
import useCategorias from '../features/categorias/hooks/useCategorias';

function TarjetaResumen({ titulo, valor, detalle, Icon }) {
  return <article className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center gap-3 min-w-0">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-[#9a670b]"><Icon aria-hidden="true" className="w-5 h-5" /></div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 truncate">{titulo}</p>
      <p className="text-2xl leading-tight font-extrabold text-[#252525]">{valor}</p>
      <p className="text-[11px] text-gray-500 truncate">{detalle}</p>
    </div>
  </article>;
}

export default function Categorias() {
  const [errorConfirmacion, setErrorConfirmacion] = useState(null);
  const {
    categorias, categoriasFiltradas, resumen, cargando, guardando, eliminando,
    errorCarga, errorOperacion, mensaje, busqueda, setBusqueda,
    formularioAbierto, categoriaEditando, categoriaPendienteEliminar,
    cargar, abrirCrear, abrirEditar, cerrarFormulario, guardar,
    solicitarEliminacion, cancelarEliminacion, confirmarEliminacion,
    limpiarMensaje, limpiarErrorOperacion,
  } = useCategorias();

  const pedirEliminacion = (categoria) => {
    setErrorConfirmacion(null);
    solicitarEliminacion(categoria);
  };

  const confirmar = async () => {
    setErrorConfirmacion(errorOperacion);
    await confirmarEliminacion();
  };

  const cerrarConfirmacion = () => {
    cancelarEliminacion();
    limpiarErrorOperacion();
    setErrorConfirmacion(null);
  };

  return <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
          <Tags aria-hidden="true" className="w-4 h-4 text-[#e19922]" /><span>Administración</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">Gestión de categorías</h1>
        <p className="mt-1 text-sm text-gray-500">Organiza las categorías y revisa los libros asociados.</p>
      </div>
      <button type="button" onClick={abrirCrear} className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white transition-colors shadow-sm">
        <FolderPlus aria-hidden="true" className="w-4 h-4" /><span>Nueva categoría</span>
      </button>
    </header>

    {mensaje && <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" aria-live="polite">
      <CircleCheck aria-hidden="true" className="w-5 h-5 shrink-0" /><p className="flex-1">{mensaje}</p>
      <button type="button" onClick={limpiarMensaje} aria-label="Cerrar confirmación" className="min-h-11 min-w-11 flex items-center justify-center rounded p-0.5 hover:bg-emerald-100"><X aria-hidden="true" className="w-4 h-4" /></button>
    </div>}

    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" aria-label="Resumen de categorías">
      <TarjetaResumen titulo="Categorías" valor={resumen.total} detalle="Registradas en el catálogo" Icon={Tags} />
      <TarjetaResumen titulo="Libros asociados" valor={resumen.libros} detalle="En todas las categorías" Icon={FolderPlus} />
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4" aria-label="Buscar categorías">
      <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-3">
        <Search aria-hidden="true" className="w-4 h-4" /><span>Buscar categoría</span>
      </div>
      <div className="max-w-xl">
        <FieldLabel>Nombre</FieldLabel>
        <Input type="search" aria-label="Buscar categorías por nombre" placeholder="Buscar categorías..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
      </div>
    </section>

    <div className="flex items-center justify-between gap-3 text-xs text-gray-500 mb-3">
      <span role="status" aria-live="polite">{cargando ? 'Actualizando listado...' : `${categoriasFiltradas.length} de ${categorias.length} categorías`}</span>
      {busqueda && <button type="button" onClick={() => setBusqueda('')} className="font-bold text-[#8a5b08] hover:underline">Limpiar búsqueda</button>}
    </div>
    <TablaCategorias
      categorias={categoriasFiltradas}
      totalCategorias={categorias.length}
      cargando={cargando}
      error={errorCarga}
      onEditar={abrirEditar}
      onEliminar={pedirEliminacion}
      onReintentar={cargar}
    />

    {formularioAbierto && <FormularioCategoria
      key={categoriaEditando?.id || 'nueva'}
      categoria={categoriaEditando}
      guardando={guardando}
      error={errorOperacion}
      onClose={() => { cerrarFormulario(); limpiarErrorOperacion(); }}
      onGuardar={guardar}
    />}

    {categoriaPendienteEliminar && <Modal>
      <section role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar-categoria" aria-describedby="descripcion-eliminar-categoria" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-eliminar-categoria" className="text-lg font-extrabold text-[#252525]">Eliminar categoría</h2>
            <p className="mt-1 text-xs text-gray-500 break-words">{categoriaPendienteEliminar.nombre}</p>
          </div>
          <button type="button" onClick={cerrarConfirmacion} disabled={eliminando} aria-label="Cerrar confirmación" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#252525] disabled:opacity-40"><X aria-hidden="true" className="w-5 h-5" /></button>
        </div>
        {(errorOperacion || errorConfirmacion) && <ErrorBox error={errorOperacion || errorConfirmacion} />}
        <p id="descripcion-eliminar-categoria" className="text-sm text-gray-600">
          ¿Confirmas que deseas eliminar esta categoría? Solo se eliminará si no tiene libros asociados.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
          <button type="button" onClick={cerrarConfirmacion} disabled={eliminando} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={confirmar} disabled={eliminando} className="min-h-11 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{eliminando ? 'Eliminando...' : 'Confirmar eliminación'}</button>
        </div>
      </section>
    </Modal>}
  </div>;
}

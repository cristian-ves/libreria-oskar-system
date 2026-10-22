import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useNuevaVenta from '../features/ventas/hooks/useNuevaVenta';
import BuscadorLibrosVenta from '../features/ventas/components/BuscadorLibrosVenta';
import LineasVenta from '../features/ventas/components/LineasVenta';
import ResumenVenta from '../features/ventas/components/ResumenVenta';
import FormularioCliente from '../features/ventas/components/FormularioCliente';
import ErrorBox from '../components/ui/ErrorBox';
import OpcionesSegmentadas from '../components/ui/OpcionesSegmentadas';
import FieldLabel from '../components/ui/FieldLabel';

export default function NuevaVenta() {
  const v = useNuevaVenta();

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/ventas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#252525] mb-3">
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a ventas</span>
      </Link>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight mb-6">Nueva venta</h1>

      <ErrorBox error={v.errorInicial} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div>
            {v.bodegas.length > 1 ? (
              <>
                <FieldLabel>Bodega</FieldLabel>
                <OpcionesSegmentadas
                  ariaLabel="Bodega"
                  opciones={v.bodegas.map((b) => ({ valor: b.id, etiqueta: b.nombre }))}
                  valor={v.bodegaId}
                  onChange={v.cambiarBodega}
                />
              </>
            ) : (
              <p className="text-xs text-gray-500 font-medium">
                Bodega: <strong className="text-[#252525]">{v.bodegas[0]?.nombre || '—'}</strong>
              </p>
            )}
          </div>
          <BuscadorLibrosVenta
            busqueda={v.busqueda}
            setBusqueda={v.setBusqueda}
            resultados={v.resultados}
            buscando={v.buscando}
            error={v.errorBusqueda}
            lineas={v.lineas}
            onAgregar={v.agregarLibro}
          />
          <LineasVenta lineas={v.lineas} onCantidad={v.cambiarCantidad} onQuitar={v.quitarLinea} />
        </div>

        <div className="space-y-5">
          <ResumenVenta
            subtotal={v.subtotal}
            total={v.total}
            descuento={v.descuento}
            setDescuento={v.setDescuento}
            errorDescuento={v.errorDescuento}
          />
          <FormularioCliente
            metodoPago={v.metodoPago}
            setMetodoPago={v.setMetodoPago}
            clienteNombre={v.clienteNombre}
            setClienteNombre={v.setClienteNombre}
            clienteNit={v.clienteNit}
            setClienteNit={v.setClienteNit}
            notas={v.notas}
            setNotas={v.setNotas}
          />
          <ErrorBox error={v.error} />
          {v.errorRed && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
              <p className="font-bold">
                No se pudo confirmar la venta por un error de conexión. Antes de reintentar, revisa el listado de
                ventas: la venta pudo haberse registrado.
              </p>
              <Link to="/ventas" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                Abrir el listado de ventas en una pestaña nueva
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={v.registrarVenta}
            disabled={!v.puedeEnviar || !v.bodegaId}
            className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            {v.enviando ? 'Registrando...' : 'Registrar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

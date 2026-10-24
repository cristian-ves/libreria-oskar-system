import { SlidersHorizontal } from 'lucide-react';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

function Campo({ label, children }) { return <div><FieldLabel>{label}</FieldLabel>{children}</div>; }

export default function FiltrosReporte({ reporte, filtros, onChange, categorias, bodegas, vendedores, disabled, busquedaLibro, setBusquedaLibro, librosDisponibles, libroSeleccionado, seleccionarLibro, errorBusquedaLibro }) {
  const mostrar = (key) => reporte.filtros.includes(key);
  return <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm" aria-label="Filtros del reporte">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a5b08] mb-3"><SlidersHorizontal aria-hidden="true" className="w-4 h-4" />Filtros</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {mostrar('fecha') && <Campo label="Fecha del corte"><Input type="date" value={filtros.fecha} onChange={(event) => onChange('fecha', event.target.value)} disabled={disabled} /></Campo>}
      {mostrar('desde') && <Campo label="Desde"><Input type="date" value={filtros.desde} onChange={(event) => onChange('desde', event.target.value)} disabled={disabled} /></Campo>}
      {mostrar('hasta') && <Campo label="Hasta"><Input type="date" value={filtros.hasta} onChange={(event) => onChange('hasta', event.target.value)} disabled={disabled} /></Campo>}
      {mostrar('categoriaId') && <Campo label="Categoría"><Select value={filtros.categoriaId} onChange={(event) => onChange('categoriaId', event.target.value)} disabled={disabled}><option value="">Todas las categorías</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</Select></Campo>}
      {mostrar('bodegaId') && <Campo label="Bodega"><Select value={filtros.bodegaId} onChange={(event) => onChange('bodegaId', event.target.value)} disabled={disabled}><option value="">Todas las bodegas</option>{bodegas.map((bodega) => <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>)}</Select></Campo>}
      {mostrar('libroId') && <div className="space-y-2"><Campo label="Buscar libro por título"><Input type="search" value={busquedaLibro} onChange={(event) => setBusquedaLibro(event.target.value)} placeholder="Escribe al menos 2 caracteres" disabled={disabled} autoComplete="off" /></Campo><Select aria-label="Libro del reporte" value={filtros.libroId} onChange={(event) => seleccionarLibro(event.target.value)} disabled={disabled}><option value="">Todos los libros</option>{libroSeleccionado && !librosDisponibles.some((libro) => libro.id === libroSeleccionado.id) && <option value={libroSeleccionado.id}>{libroSeleccionado.titulo} · {libroSeleccionado.isbn || 'Sin ISBN'}</option>}{librosDisponibles.map((libro) => <option key={libro.id} value={libro.id}>{libro.titulo} · {libro.isbn || 'Sin ISBN'}</option>)}</Select>{errorBusquedaLibro && <p className="text-xs text-red-700" role="status">{errorBusquedaLibro}</p>}</div>}
      {mostrar('tipo') && <Campo label="Tipo de movimiento"><Select value={filtros.tipo} onChange={(event) => onChange('tipo', event.target.value)} disabled={disabled}><option value="">Todos los tipos</option>{['Ingreso', 'Salida', 'Ajuste', 'Ajuste Auditoria'].map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</Select></Campo>}
      {mostrar('estado') && <Campo label="Estado de venta"><Select value={filtros.estado} onChange={(event) => onChange('estado', event.target.value)} disabled={disabled}><option value="">Todos los estados</option><option value="Completada">Completada</option><option value="Anulada">Anulada</option></Select></Campo>}
      {mostrar('vendedorId') && <Campo label="Vendedor"><Select value={filtros.vendedorId} onChange={(event) => onChange('vendedorId', event.target.value)} disabled={disabled}><option value="">Todos los vendedores</option>{vendedores.map((vendedor) => <option key={vendedor.id} value={vendedor.id}>{vendedor.nombre_completo} ({vendedor.rol_nombre})</option>)}</Select></Campo>}
      {mostrar('metodoPago') && <Campo label="Método de pago"><Select value={filtros.metodoPago} onChange={(event) => onChange('metodoPago', event.target.value)} disabled={disabled}><option value="">Todos los métodos</option><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option></Select></Campo>}
    </div>
  </section>;
}

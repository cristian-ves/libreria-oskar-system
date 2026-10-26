import { AlertTriangle, ChartNoAxesCombined } from 'lucide-react';

const dinero = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 });
function valor(value, tipo = 'text') {
  if (value === null || value === undefined || value === '') return 'No disponible';
  if (tipo === 'money') return dinero.format(Number(value));
  if (tipo === 'percent') return `${value}%`;
  return String(value);
}
function Tarjeta({ label, value, type }) { return <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-words text-lg font-extrabold text-[#252525]">{valor(value, type)}</p></div>; }

export default function ResumenReporte({ tipo, datos }) {
  if (!datos) return null;
  let tarjetas = [];
  let notas = [];
  if (tipo === 'corte-caja') {
    tarjetas = [['Ventas vigentes', datos.ventas?.cantidad], ['Total bruto', datos.ventas?.bruto, 'money'], ['Descuentos', datos.ventas?.descuentos, 'money'], ['Neto vigente', datos.ventas?.neto, 'money'], ['Ventas anuladas', datos.anuladas?.cantidad], ['Total original anulado', datos.anuladas?.total_original, 'money']];
    notas = ['Este corte resume ventas diarias; no es una conciliación física de efectivo. Las ventas anuladas se muestran por separado.'];
  } else if (tipo === 'resumen-periodo') {
    tarjetas = [['Ventas vigentes', datos.periodo?.cantidad_ventas], ['Bruto', datos.periodo?.bruto, 'money'], ['Descuentos', datos.periodo?.descuentos, 'money'], ['Neto vigente', datos.periodo?.neto, 'money'], ['Anulaciones', datos.periodo?.anulaciones?.cantidad], ['Total original anulado', datos.periodo?.anulaciones?.total_original, 'money'], ['Variación neta', datos.comparacion?.variacion_neto_porcentaje, 'percent'], ['Neto período comparable', datos.comparacion?.periodo?.neto, 'money']];
    notas = [datos.comparacion?.criterio, 'Las fechas inicial y final son inclusivas.'];
  } else if (tipo === 'libros-mas-vendidos') {
    tarjetas = [['Libros en el ranking', datos.total], ['Página', datos.limit ? `${Math.floor((datos.offset || 0) / datos.limit) + 1} de ${Math.max(1, Math.ceil((datos.total || 0) / datos.limit))}` : 'No disponible']];
    notas = ['Los ingresos del ranking son subtotales históricos de líneas antes del descuento global; solo incluye ventas completadas y conserva libros hoy inactivos.'];
  } else if (tipo === 'reposicion') {
    tarjetas = [['Inventarios filtrados', datos.total], ['Registros de esta página', datos.registros?.length || 0], ['Con necesidad de reposición en esta página', datos.registros?.filter((row) => row.necesita_reposicion).length || 0]];
    notas = [datos.criterio, 'La cantidad sugerida se muestra como No disponible: no hay información suficiente para calcular una compra.'];
  } else if (tipo === 'inventario-valorizado') {
    tarjetas = [['Registros filtrados', datos.total], ['Existencias globales', datos.resumen?.existencias, 'number'], ['Valorización disponible', datos.resumen?.valoracion_disponible ? 'Sí' : 'No']];
    notas = ['La valorización monetaria no está disponible porque el sistema no registra costos de adquisición.'];
  } else if (tipo === 'kardex') {
    tarjetas = [['Movimientos filtrados', datos.total], ['Movimientos en esta página', datos.movimientos?.length || 0]];
    notas = ['El saldo histórico por movimiento no está disponible. En ajustes, la cantidad representa el stock fijado, no un delta.'];
  } else if (tipo === 'ventas') {
    tarjetas = [['Ventas filtradas', datos.total], ['Página', `${Math.floor((datos.offset || 0) / (datos.limit || 50)) + 1} de ${Math.max(1, Math.ceil((datos.total || 0) / (datos.limit || 50)))}`]];
    notas = ['Se conservan ventas completadas y anuladas con los importes históricos originales.'];
  } else if (tipo === 'stock-obsoleto') {
    tarjetas = [['Inventarios sin rotación', datos.total], ['Existencias en resultados', datos.resumen?.existencias_filtradas], ['Período evaluado', `${datos.filtros?.diasSinVenta || 180} días`], ['Página', `${Math.floor((datos.offset || 0) / (datos.limit || 50)) + 1} de ${Math.max(1, Math.ceil((datos.total || 0) / (datos.limit || 50)))}`]];
    notas = [datos.criterio, 'La última venta se mide por libro y bodega. El inventario inactivo/operativo se determina por el estado actual de libro, bodega y sucursal.', 'El precio vigente es un precio de venta y no se usa para estimar costo ni capital inmovilizado.'];
  }

  return <section aria-label="Resumen del reporte" className="space-y-3">
    {tarjetas.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{tarjetas.map(([label, value, type]) => <Tarjeta key={label} label={label} value={value} type={type} />)}</div>}
    {(notas.filter(Boolean).length > 0 || tipo === 'inventario-valorizado') && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950" role="note">
      <div className="flex gap-2"><AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0 text-amber-700" /><div className="space-y-1">{notas.filter(Boolean).map((nota, index) => <p key={index}>{nota}</p>)}</div></div>
    </div>}
    {tipo === 'inventario-valorizado' && <div className="flex items-center gap-2 text-xs text-gray-500"><ChartNoAxesCombined aria-hidden="true" className="w-4 h-4" />Los campos de costo y valor permanecen como No disponible, nunca como cero.</div>}
  </section>;
}

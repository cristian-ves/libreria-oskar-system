import { useState } from 'react';
import { postSalida } from '../../../services/api/inventario.api';
import { actualizarPrecioLibro } from '../../../services/api/libros.api';

async function leerRespuesta(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || 'No se pudo completar la operación.');
  return json.data;
}

function AccionFila({ registro, onComplete }) {
  const [precio, setPrecio] = useState(String(registro.precio_vigente ?? ''));
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function guardarPrecio(event) {
    event.preventDefault();
    const value = Number(precio);
    if (!Number.isFinite(value) || value < 0 || !/^\d+(\.\d{1,2})?$/.test(precio.trim())) {
      setError('Ingresa un precio válido con hasta dos decimales.'); return;
    }
    if (!window.confirm(`Cambiar el precio de “${registro.titulo}” de Q ${registro.precio_vigente} a Q ${value.toFixed(2)}? El precio se aplica al libro en todas las bodegas y sucursales.`)) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const response = await actualizarPrecioLibro(registro.libro_id, value);
      await leerRespuesta(response);
      setMensaje('Precio actualizado. El cambio aplica en todas las bodegas; las ventas históricas conservan sus importes.');
      onComplete();
    } catch (err) { setError(err.message || 'No se pudo actualizar el precio.'); }
    finally { setOcupado(false); }
  }

  async function registrarSalida(event) {
    event.preventDefault();
    const unidades = Number(cantidad);
    if (!Number.isInteger(unidades) || unidades < 1 || unidades > Number(registro.existencias)) {
      setError(`La cantidad debe ser un entero entre 1 y ${registro.existencias}.`); return;
    }
    if (motivo.trim().length < 3) { setError('Escribe un motivo de al menos 3 caracteres.'); return; }
    if (!window.confirm(`Registrar salida de ${unidades} unidad(es) de “${registro.titulo}” en ${registro.bodega}?`)) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const response = await postSalida(registro.inventario_id, { cantidad: unidades, motivo: motivo.trim() });
      await leerRespuesta(response);
      setMensaje('Salida registrada en el Kardex.'); setCantidad(''); setMotivo('');
      onComplete();
    } catch (err) { setError(err.message || 'No se pudo registrar la salida.'); }
    finally { setOcupado(false); }
  }

  return <details className="rounded-xl border border-gray-200 bg-white p-3">
    <summary className="cursor-pointer font-bold text-[#8a5b08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Acciones para {registro.titulo} · {registro.bodega}</summary>
    <div className="mt-3 grid gap-4 lg:grid-cols-2">
      <form onSubmit={guardarPrecio} className="space-y-2 rounded-lg bg-gray-50 p-3">
        <h3 className="text-sm font-bold">Liquidación mediante precio</h3>
        <p className="text-xs text-gray-600">Precio vigente: Q {registro.precio_vigente ?? 'No disponible'}. El cambio afecta todas las bodegas y sucursales.</p>
        <label className="block text-xs font-semibold" htmlFor={`precio-${registro.inventario_id}`}>Precio nuevo (Q)</label>
        <input id={`precio-${registro.inventario_id}`} inputMode="decimal" value={precio} onChange={(event) => setPrecio(event.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 px-3" disabled={ocupado} />
        <button type="submit" disabled={ocupado} className="min-h-11 rounded-lg bg-[#e19922] px-4 text-sm font-bold text-[#252525] disabled:opacity-60">Actualizar precio</button>
      </form>
      <form onSubmit={registrarSalida} className="space-y-2 rounded-lg bg-gray-50 p-3">
        <h3 className="text-sm font-bold">Baja justificada de existencias</h3>
        <p className="text-xs text-gray-600">Existencias disponibles: {registro.existencias}. Se conservará el movimiento en Kardex.</p>
        <label className="block text-xs font-semibold" htmlFor={`cantidad-${registro.inventario_id}`}>Cantidad</label>
        <input id={`cantidad-${registro.inventario_id}`} type="number" min="1" max={registro.existencias} step="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 px-3" disabled={ocupado} required />
        <label className="block text-xs font-semibold" htmlFor={`motivo-${registro.inventario_id}`}>Motivo obligatorio</label>
        <textarea id={`motivo-${registro.inventario_id}`} value={motivo} onChange={(event) => setMotivo(event.target.value)} minLength="3" maxLength="500" className="min-h-20 w-full rounded-lg border border-gray-300 p-3" disabled={ocupado} required />
        <button type="submit" disabled={ocupado} className="min-h-11 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-800 disabled:opacity-60">Registrar salida</button>
      </form>
    </div>
    {mensaje && <p className="mt-3 text-sm text-green-800" role="status">{mensaje}</p>}
    {error && <p className="mt-3 text-sm text-red-800" role="alert">{error}</p>}
  </details>;
}

export default function AccionesStockObsoleto({ registros, onComplete }) {
  if (!registros.length) return null;
  return <section className="space-y-3" aria-label="Acciones correctivas de stock obsoleto">
    <h2 className="text-lg font-extrabold text-[#252525]">Acciones correctivas</h2>
    <p className="text-xs text-gray-600">El cambio de precio se aplica globalmente al libro. La salida registra un movimiento mediante el flujo de inventario existente.</p>
    {registros.map((registro) => <AccionFila key={registro.inventario_id} registro={registro} onComplete={onComplete} />)}
  </section>;
}

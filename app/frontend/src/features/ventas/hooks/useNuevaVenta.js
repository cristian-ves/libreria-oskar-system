import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBodegas } from '../../../services/api/bodegas.api';
import { buscarLibrosParaVenta, crearVenta } from '../../../services/api/ventas.api';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { aCentavos, deCentavos } from '../../../utils/dinero';

const MAX_RESULTADOS = 20;
const cantidadValida = (l) => /^\d+$/.test(l.cantidad) && Number(l.cantidad) >= 1 && Number(l.cantidad) <= l.stock;

export default function useNuevaVenta() {
  const navigate = useNavigate();
  const enviandoRef = useRef(false);

  const [bodegas, setBodegas] = useState([]);
  const [bodegaId, setBodegaId] = useState('');
  const [errorInicial, setErrorInicial] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(null);
  const termino = useDebouncedValue(busqueda.trim(), 300);

  const [lineas, setLineas] = useState([]);
  const [descuento, setDescuento] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNit, setClienteNit] = useState('');
  const [notas, setNotas] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [errorRed, setErrorRed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBodegas();
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        const data = json.data || [];
        setBodegas(data);
        setBodegaId(data[0]?.id || '');
      } catch {
        setErrorInicial({ message: 'No se pudieron cargar las bodegas.' });
      }
    })();
  }, []);

  useEffect(() => {
    if (!termino) {
      setResultados([]);
      setErrorBusqueda(null);
      return undefined;
    }
    let cancelado = false;
    (async () => {
      try {
        setBuscando(true);
        const res = await buscarLibrosParaVenta(termino);
        const json = await res.json();
        if (cancelado) return;
        if (!res.ok) throw new Error(json.message);
        setResultados((json.data || []).slice(0, MAX_RESULTADOS));
        setErrorBusqueda(null);
      } catch {
        if (cancelado) return;
        setResultados([]);
        setErrorBusqueda({ message: 'No se pudo buscar libros.' });
      } finally {
        if (!cancelado) setBuscando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [termino]);

  const cambiarBodega = (id) => {
    setBodegaId(id);
    setLineas([]);
    setDescuento('');
    setError(null);
    setErrorRed(false);
  };

  const agregarLibro = (libro) => {
    setLineas((prev) => [
      ...prev,
      {
        libroId: libro.id,
        titulo: libro.titulo,
        precio: aCentavos(libro.precio) ?? 0,
        stock: libro.stock_total,
        cantidad: '1',
      },
    ]);
  };

  const cambiarCantidad = (libroId, cantidad) => {
    setLineas((prev) => prev.map((l) => (l.libroId === libroId ? { ...l, cantidad } : l)));
  };

  const quitarLinea = (libroId) => {
    setLineas((prev) => prev.filter((l) => l.libroId !== libroId));
  };

  // ── Totales en centavos enteros ───────────────────────────────────────────
  const lineasValidas = lineas.length > 0 && lineas.every(cantidadValida);
  const subtotal = lineas.reduce((acc, l) => (cantidadValida(l) ? acc + l.precio * Number(l.cantidad) : acc), 0);
  const descuentoCentavos = descuento.trim() === '' ? 0 : aCentavos(descuento);
  let errorDescuento = null;
  if (descuentoCentavos === null) errorDescuento = 'El descuento debe ser un monto en quetzales con máximo 2 decimales.';
  else if (descuentoCentavos > subtotal) errorDescuento = 'El descuento no puede ser mayor que el subtotal.';
  const total = errorDescuento ? subtotal : subtotal - descuentoCentavos;
  const puedeEnviar = lineasValidas && !errorDescuento && !enviando;

  const registrarVenta = async () => {
    if (enviandoRef.current || !puedeEnviar) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    setErrorRed(false);

    const payload = {
      bodegaId,
      items: lineas.map((l) => ({ libroId: l.libroId, cantidad: Number(l.cantidad) })),
      metodoPago,
    };
    if (clienteNombre.trim()) payload.clienteNombre = clienteNombre.trim();
    if (clienteNit.trim()) payload.clienteNit = clienteNit.trim();
    if (descuentoCentavos > 0) payload.descuento = deCentavos(descuentoCentavos);
    if (notas.trim()) payload.notas = notas.trim();

    try {
      const res = await crearVenta(payload);
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        navigate(json.data?.id ? `/ventas/${json.data.id}` : '/ventas', { state: { recienCreada: true } });
        return;
      }
      setError({ message: json.message || 'No se pudo registrar la venta.', details: json.details });
    } catch {
      setErrorRed(true);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return {
    bodegas, bodegaId, cambiarBodega, errorInicial,
    busqueda, setBusqueda, resultados, buscando, errorBusqueda,
    lineas, agregarLibro, cambiarCantidad, quitarLinea,
    subtotal, total, descuento, setDescuento, errorDescuento,
    metodoPago, setMetodoPago, clienteNombre, setClienteNombre,
    clienteNit, setClienteNit, notas, setNotas,
    enviando, puedeEnviar, error, errorRed, registrarVenta,
  };
}

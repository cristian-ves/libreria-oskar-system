import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  BookOpen,
  User,
  Building2,
  Tag,
  Layers,
  ArrowLeft,
  MapPin,
  Phone,
  Warehouse,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

function DisponibilidadItem({ item }) {
  const stock = Number(item.stock_actual) || 0;
  const tieneStock = stock > 0;

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{item.sucursal_nombre}</span>
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <Warehouse className="w-3 h-3 text-slate-400" />
            {item.bodega_nombre}
          </span>
        </div>
        {item.sucursal_direccion && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{item.sucursal_direccion}</span>
          </p>
        )}
        {item.sucursal_telefono && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{item.sucursal_telefono}</span>
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center">
        {tieneStock ? (
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {stock} {stock === 1 ? 'unidad' : 'unidades'}
          </span>
        ) : (
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            Agotado
          </span>
        )}
      </div>
    </div>
  );
}

function DetalleSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-4 w-32 bg-slate-800 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 h-80 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="h-8 w-3/4 bg-slate-900 rounded-xl" />
          <div className="h-4 w-1/2 bg-slate-900 rounded" />
          <div className="h-4 w-1/3 bg-slate-900 rounded" />
          <div className="h-24 w-full bg-slate-900 rounded-xl mt-6" />
          <div className="h-32 w-full bg-slate-900 rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}

export default function LibroDetalle() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [libro, setLibro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reintentar = () => {
    setReloadCounter((c) => c + 1);
  };

  const handleVolver = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/catalogo');
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    async function cargarDetalle() {
      try {
        const res = await fetch(`/api/libros/${encodeURIComponent(ref)}`);
        if (cancelled) return;

        if (res.status === 404) {
          setIsNotFound(true);
          return;
        }

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || `Error al obtener el libro (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (cancelled) return;

        const data = json.data;
        if (data) {
          setLibro(data);

          // Si el ref canónico difiere del actual en la URL, actualizarla sin agregar historial
          if (data.ref && data.ref !== ref) {
            navigate(`/catalogo/${data.ref}`, { replace: true });
          }
        } else {
          setIsNotFound(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error de conexión.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      cancelled = true;
    };
  }, [ref, reloadCounter, navigate]);

  // Actualizar document.title
  useEffect(() => {
    const prevTitle = document.title;
    if (libro?.titulo) {
      document.title = `${libro.titulo} — Librería Oskar`;
    }
    return () => {
      document.title = prevTitle;
    };
  }, [libro?.titulo]);

  if (loading) {
    return <DetalleSkeleton />;
  }

  if (isNotFound) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 max-w-lg mx-auto shadow-2xl">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Libro no encontrado</h1>
          <p className="text-xs text-slate-400 mb-6">
            El ejemplar que buscas no existe o fue retirado del catálogo disponible.
          </p>
          <button
            type="button"
            onClick={handleVolver}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al catálogo</span>
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-8 max-w-md mx-auto shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white mb-1">Ocurrió un error</h2>
          <p className="text-xs text-slate-400 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleVolver}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
            <button
              type="button"
              onClick={reintentar}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!libro) return null;

  const precioNum = Number(libro.precio);
  const precioTexto = precioNum > 0 ? `Q ${precioNum.toFixed(2)}` : 'Precio por confirmar';
  const disponibilidadLista = Array.isArray(libro.disponibilidad) ? libro.disponibilidad : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleVolver}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver al catálogo</span>
        </button>
      </div>

      {/* Contenido principal en 2 columnas en md+ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Portada */}
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 sm:w-64 h-80 sm:h-96 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center relative group">
            {libro.imagen_url ? (
              <img
                src={libro.imagen_url}
                alt={libro.titulo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="text-center p-6">
                <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-2" />
                <span className="text-xs text-slate-500">Sin imagen de portada</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Metadatos y Disponibilidad */}
        <div className="md:col-span-8 space-y-6">
          {/* Encabezado del libro */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {libro.categoria_id && libro.categoria_nombre && (
                <Link
                  to={`/catalogo?categoriaId=${libro.categoria_id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  <span>{libro.categoria_nombre}</span>
                </Link>
              )}
              {libro.isbn && (
                <span className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                  ISBN: {libro.isbn}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              {libro.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <p className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>{libro.autor_nombre || 'Autor desconocido'}</span>
              </p>
              {libro.editorial_nombre && (
                <p className="flex items-center gap-1.5 text-slate-400">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{libro.editorial_nombre}</span>
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="pt-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                {precioTexto}
              </span>
            </div>
          </div>

          {/* Reseña */}
          {libro.resena && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">Sinopsis / Reseña</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {libro.resena}
              </p>
            </div>
          )}

          {/* Disponibilidad */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Disponibilidad en Tiendas</h2>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Stock Total: {libro.stock_total || 0}
              </span>
            </div>

            {disponibilidadLista.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Sin existencias registradas por el momento
              </p>
            ) : (
              <div className="space-y-2.5">
                {disponibilidadLista.map((disp, idx) => (
                  <DisponibilidadItem
                    key={`${disp.sucursal_nombre}-${disp.bodega_nombre}-${idx}`}
                    item={disp}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="bg-[#f3f3f3] border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#252525] text-sm">{item.sucursal_nombre}</span>
          <span className="text-gray-500 text-xs flex items-center gap-1 font-medium">
            <Warehouse className="w-3 h-3 text-[#b07c19]" />
            {item.bodega_nombre}
          </span>
        </div>
        {item.sucursal_direccion && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{item.sucursal_direccion}</span>
          </p>
        )}
        {item.sucursal_telefono && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{item.sucursal_telefono}</span>
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center">
        {tieneStock ? (
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-[#e19922] text-[#252525] shadow-xs">
            {stock} {stock === 1 ? 'unidad' : 'unidades'}
          </span>
        ) : (
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-red-100 border border-red-200 text-red-700">
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
      <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 h-80 bg-white border border-gray-200 rounded-2xl shadow-sm" />
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded-xl" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-24 w-full bg-white border border-gray-200 rounded-xl mt-6 shadow-sm" />
          <div className="h-32 w-full bg-white border border-gray-200 rounded-xl mt-6 shadow-sm" />
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
        <div className="bg-white border border-gray-200 rounded-2xl p-12 max-w-lg mx-auto shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#252525] mb-2">Libro no encontrado</h1>
          <p className="text-xs text-gray-500 mb-6">
            El ejemplar que buscas no existe o fue retirado del catálogo disponible.
          </p>
          <button
            type="button"
            onClick={handleVolver}
            className="inline-flex items-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
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
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#252525] mb-1">Ocurrió un error</h2>
          <p className="text-xs text-gray-500 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleVolver}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
            <button
              type="button"
              onClick={reintentar}
              className="inline-flex items-center gap-1.5 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
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
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#b07c19] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver al catálogo</span>
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Portada */}
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 sm:w-64 h-80 sm:h-96 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex items-center justify-center relative">
            {libro.imagen_url ? (
              <img
                src={libro.imagen_url}
                alt={libro.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                <span className="text-xs text-gray-400 font-medium">Sin imagen de portada</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadatos y Disponibilidad */}
        <div className="md:col-span-8 space-y-6">
          {/* Encabezado */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {libro.categoria_id && libro.categoria_nombre && (
                <Link
                  to={`/catalogo?categoriaId=${libro.categoria_id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#252525] bg-[#e8c85e] hover:bg-[#b07c19] hover:text-white px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                >
                  <Tag className="w-3 h-3" />
                  <span>{libro.categoria_nombre}</span>
                </Link>
              )}
              {libro.isbn && (
                <span className="text-xs font-mono font-semibold text-gray-600 bg-[#f3f3f3] border border-gray-200 px-2.5 py-1 rounded-lg">
                  ISBN: {libro.isbn}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight leading-snug">
              {libro.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
              <p className="flex items-center gap-1.5 font-medium">
                <User className="w-4 h-4 text-[#b07c19]" />
                <span className="font-bold text-[#252525]">{libro.autor_nombre || 'Autor desconocido'}</span>
              </p>
              {libro.editorial_nombre && (
                <p className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{libro.editorial_nombre}</span>
                </p>
              )}
            </div>

            <div className="pt-2">
              <span className="text-2xl font-extrabold text-[#252525] font-mono">
                {precioTexto}
              </span>
            </div>
          </div>

          {/* Reseña */}
          {libro.resena && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#b07c19]">Sinopsis / Reseña</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {libro.resena}
              </p>
            </div>
          )}

          {/* Disponibilidad */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#e19922]" />
                <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider">Disponibilidad en Tiendas</h2>
              </div>
              <span className="text-xs font-mono font-extrabold text-[#b07c19]">
                Stock Total: {libro.stock_total || 0}
              </span>
            </div>

            {disponibilidadLista.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center font-medium">
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

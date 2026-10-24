import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCategoriasCatalogo, getLibrosCatalogo } from '../../../services/api/catalogo.api';

export default function useCatalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [libros, setLibros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [categoriaId, setCategoriaId] = useState(() => searchParams.get('categoriaId') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(12);
  const [offset, setOffset] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getCategoriasCatalogo()
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setCategorias(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        const nextParams = {};
        if (searchTerm.trim()) nextParams.q = searchTerm.trim();
        if (categoriaId) nextParams.categoriaId = categoriaId;
        setSearchParams(nextParams, { replace: true });

        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        if (categoriaId) params.set('categoriaId', categoriaId);

        const res = await getLibrosCatalogo(params, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'No se pudo cargar el catálogo.');
        if (!active) return;

        const uniqueBooks = [...new Map((json.data || []).map((book) => [book.id, book])).values()];
        const nextTotal = Number(json.total ?? json.results ?? uniqueBooks.length) || 0;
        setLibros(uniqueBooks);
        setTotal(nextTotal);
        setLimit(Number(json.limit) || limit);

        const lastOffset = nextTotal === 0 ? 0 : Math.floor((nextTotal - 1) / limit) * limit;
        if (offset > lastOffset) setOffset(lastOffset);
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          console.error('[CATALOG ERROR]:', err);
          setLibros([]);
          setTotal(0);
          setError(err.message || 'No se pudo cargar el catálogo.');
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, categoriaId, limit, offset, setSearchParams]);

  const hayFiltros = searchTerm.trim() !== '' || categoriaId !== null;
  const totalFiltrosActivos = (searchTerm.trim() !== '' ? 1 : 0) + (categoriaId !== null ? 1 : 0);

  const limpiarFiltros = useCallback(() => {
    setSearchTerm('');
    setCategoriaId(null);
    setOffset(0);
  }, []);

  const cambiarBusqueda = useCallback((value) => {
    setSearchTerm(value);
    setOffset(0);
  }, []);

  const cambiarCategoria = useCallback((id) => {
    setCategoriaId(id);
    setOffset(0);
  }, []);

  const cambiarTamanoPagina = useCallback((value) => {
    setLimit(value);
    setOffset(0);
  }, []);

  const handleApplySearchFromDrawer = useCallback((term) => {
    setSearchTerm(term);
    setOffset(0);
  }, []);

  const handleSelectCategoryWithSearchFromDrawer = useCallback((catId, draftTerm) => {
    setCategoriaId(catId);
    setSearchTerm(draftTerm);
    setOffset(0);
    setSidebarOpen(false);
  }, []);

  const quitarBusqueda = useCallback(() => {
    setSearchTerm('');
    setOffset(0);
  }, []);

  const quitarCategoria = useCallback(() => {
    setCategoriaId(null);
    setOffset(0);
  }, []);

  const categoriaNombre = categoriaId
    ? (categorias.find((c) => c.id === categoriaId)?.nombre ?? '')
    : '';

  return {
    libros,
    total,
    limit,
    offset,
    totalPaginas: Math.ceil(total / limit),
    paginaActual: total === 0 ? 0 : Math.floor(offset / limit) + 1,
    setPagina: (pagina) => setOffset((Math.max(1, pagina) - 1) * limit),
    setTamanoPagina: cambiarTamanoPagina,
    categorias,
    searchTerm,
    setSearchTerm: cambiarBusqueda,
    categoriaId,
    loading,
    error,
    sidebarOpen,
    setSidebarOpen,
    hayFiltros,
    totalFiltrosActivos,
    categoriaNombre,
    limpiarFiltros,
    elegirCategoria: cambiarCategoria,
    handleApplySearchFromDrawer,
    handleSelectCategoryWithSearchFromDrawer,
    quitarBusqueda,
    quitarCategoria,
  };
}

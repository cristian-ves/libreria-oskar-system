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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getCategoriasCatalogo()
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setCategorias(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const nextParams = {};
        if (searchTerm.trim()) nextParams.q = searchTerm.trim();
        if (categoriaId) nextParams.categoriaId = categoriaId;
        setSearchParams(nextParams, { replace: true });

        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        if (categoriaId) params.set('categoriaId', categoriaId);
        const qs = params.toString();
        const url = qs ? `/api/libros?${qs}` : '/api/libros';

        const res = await getLibrosCatalogo(url);
        if (!cancelled && res.ok) {
          const json = await res.json();
          setLibros(json.data || []);
        }
      } catch (err) {
        if (!cancelled) console.error('[CATALOG ERROR]:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, categoriaId, setSearchParams]);

  const hayFiltros = searchTerm.trim() !== '' || categoriaId !== null;
  const totalFiltrosActivos = (searchTerm.trim() !== '' ? 1 : 0) + (categoriaId !== null ? 1 : 0);

  const limpiarFiltros = useCallback(() => {
    setSearchTerm('');
    setCategoriaId(null);
  }, []);

  const elegirCategoria = useCallback((id) => {
    setCategoriaId(id);
  }, []);

  const handleApplySearchFromDrawer = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleSelectCategoryWithSearchFromDrawer = useCallback((catId, draftTerm) => {
    setCategoriaId(catId);
    setSearchTerm(draftTerm);
    setSidebarOpen(false);
  }, []);

  const quitarBusqueda = useCallback(() => {
    setSearchTerm('');
  }, []);

  const quitarCategoria = useCallback(() => {
    setCategoriaId(null);
  }, []);

  const categoriaNombre = categoriaId
    ? (categorias.find((c) => c.id === categoriaId)?.nombre ?? '')
    : '';

  return {
    libros,
    categorias,
    searchTerm,
    setSearchTerm,
    categoriaId,
    loading,
    sidebarOpen,
    setSidebarOpen,
    hayFiltros,
    totalFiltrosActivos,
    categoriaNombre,
    limpiarFiltros,
    elegirCategoria,
    handleApplySearchFromDrawer,
    handleSelectCategoryWithSearchFromDrawer,
    quitarBusqueda,
    quitarCategoria,
  };
}

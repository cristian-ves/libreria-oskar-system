import { apiFetch } from './client';

// Categorías y detalle usan fetch directo para evitar la redirección por 401.
// El listado paginado usa apiFetch para admitir AbortSignal y el manejo común de sesión.
export function getCategoriasCatalogo() {
  return fetch('/api/categorias');
}

export function getLibrosCatalogo(params, options = {}) {
  const query = params.toString();
  return apiFetch(`/api/libros${query ? `?${query}` : ''}`, options);
}

export function getLibroDetalle(ref) {
  return fetch(`/api/libros/${encodeURIComponent(ref)}`);
}

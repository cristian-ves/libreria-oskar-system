// Endpoints públicos: fetch directo (no apiFetch) para no depender de la redirección por 401.
export function getCategoriasCatalogo() {
  return fetch('/api/categorias');
}

export function getLibrosCatalogo(url) {
  return fetch(url);
}

export function getLibroDetalle(ref) {
  return fetch(`/api/libros/${encodeURIComponent(ref)}`);
}

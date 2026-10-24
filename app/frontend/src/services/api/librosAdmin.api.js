import { apiFetch } from './client';

export function getLibrosAdministracion(params, options = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return apiFetch(`/api/libros/admin?${query.toString()}`, options);
}

export function editarLibro(libroId, payload) {
  return apiFetch(`/api/libros/${encodeURIComponent(libroId)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  });
}

export function cambiarEstadoLibro(libroId, activo) {
  return apiFetch(`/api/libros/${encodeURIComponent(libroId)}/activo`, {
    method: 'PATCH', body: JSON.stringify({ activo }),
  });
}

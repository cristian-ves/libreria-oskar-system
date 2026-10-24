import { apiFetch } from './client';

export function getCategorias(options = {}) {
  return apiFetch('/api/categorias', options);
}

export function getCategoriasAdministracion(options = {}) {
  return apiFetch('/api/categorias/admin', options);
}

export function crearCategoria(payload) {
  return apiFetch('/api/categorias', { method: 'POST', body: JSON.stringify(payload) });
}

export function renombrarCategoria(id, payload) {
  return apiFetch(`/api/categorias/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function eliminarCategoria(id) {
  return apiFetch(`/api/categorias/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

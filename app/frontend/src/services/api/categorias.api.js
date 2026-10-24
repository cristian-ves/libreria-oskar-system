import { apiFetch } from './client';

export function getCategorias() {
  return apiFetch('/api/categorias');
}

export function getCategoriasAdministracion() {
  return apiFetch('/api/categorias/admin');
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

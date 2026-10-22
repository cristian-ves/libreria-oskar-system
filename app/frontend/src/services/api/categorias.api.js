import { apiFetch } from './client';

export function getCategorias() {
  return apiFetch('/api/categorias');
}

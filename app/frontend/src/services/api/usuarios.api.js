import { apiFetch } from './client';

export function getUsuarios({ incluirInactivos = true } = {}) {
  const query = incluirInactivos ? '?incluirInactivos=true' : '';
  return apiFetch(`/api/usuarios${query}`);
}

export function crearUsuario(payload) {
  return apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(payload) });
}

export function actualizarUsuario(id, payload) {
  return apiFetch(`/api/usuarios/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function cambiarEstadoUsuario(id, activo) {
  return apiFetch(`/api/usuarios/${encodeURIComponent(id)}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
}

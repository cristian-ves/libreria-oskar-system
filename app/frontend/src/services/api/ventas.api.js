import { apiFetch } from './client';

export function crearVenta(payload) {
  return apiFetch('/api/ventas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getVentas(params) {
  return apiFetch(`/api/ventas?${params.toString()}`);
}

export function getVenta(id) {
  return apiFetch(`/api/ventas/${encodeURIComponent(id)}`);
}

export function anularVenta(id, payload) {
  return apiFetch(`/api/ventas/${encodeURIComponent(id)}/anular`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buscarLibrosParaVenta(q) {
  return apiFetch(`/api/libros?q=${encodeURIComponent(q)}`);
}

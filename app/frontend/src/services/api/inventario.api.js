import { apiFetch } from './client';

export function getResumenInventario() {
  return apiFetch('/api/inventario/resumen');
}

export function getExistencias(params) {
  return apiFetch(`/api/inventario?${params.toString()}`);
}

export function getMovimientos(params) {
  return apiFetch(`/api/movimientos?${params.toString()}`);
}

export function postSalida(inventarioId, payload) {
  return apiFetch(`/api/inventario/${inventarioId}/salida`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function postAjuste(inventarioId, payload) {
  return apiFetch(`/api/inventario/${inventarioId}/ajuste`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

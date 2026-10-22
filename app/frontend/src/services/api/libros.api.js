import { apiFetch } from './client';

export function consultarLibro(payload) {
  return apiFetch('/api/libros/consultar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function ingresarLibro(libroId, payload) {
  return apiFetch(`/api/libros/${libroId}/ingreso`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registrarLibro(payload) {
  return apiFetch('/api/libros/registrar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function actualizarPrecioLibro(libroId, precio) {
  return apiFetch(`/api/libros/${libroId}/precio`, {
    method: 'PATCH',
    body: JSON.stringify({ precio }),
  });
}

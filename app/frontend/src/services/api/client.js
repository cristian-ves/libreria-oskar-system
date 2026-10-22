import { getToken, clearToken } from '../../utils/tokenStorage';

/**
 * Cliente HTTP para realizar peticiones a la API del backend con inyección de JWT.
 * @param {string} path - Ruta del endpoint (ej. /api/libros)
 * @param {RequestInit} [options] - Opciones estándar de fetch
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = getToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  // Si la respuesta es 401 y existía token, limpiar sesión y redirigir
  if (response.status === 401 && token) {
    clearToken();
    window.location.assign('/login');
  }

  return response;
}

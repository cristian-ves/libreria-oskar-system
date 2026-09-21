/**
 * Cliente HTTP para realizar peticiones a la API del backend con inyección de JWT.
 * @param {string} path - Ruta del endpoint (ej. /api/libros)
 * @param {RequestInit} [options] - Opciones estándar de fetch
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  let token = null;
  try {
    token = localStorage.getItem('oskar_token');
  } catch (err) {
    console.error('[API CLIENT]: Error al leer token de localStorage:', err);
  }

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
    try {
      localStorage.removeItem('oskar_token');
    } catch (err) {
      console.error('[API CLIENT]: Error al eliminar token de localStorage:', err);
    }
    window.location.assign('/login');
  }

  return response;
}

export const TOKEN_KEY = 'oskar_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.error('[TOKEN STORAGE]: Error al leer token de localStorage:', err);
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('[TOKEN STORAGE]: Error al guardar token en localStorage:', err);
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('[TOKEN STORAGE]: Error al eliminar token de localStorage:', err);
  }
}

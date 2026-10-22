// Usa fetch directo (no apiFetch): un 401 aquí no debe purgar el token ni redirigir.
export function fetchSesion(token) {
  return fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function loginRequest(email, password) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

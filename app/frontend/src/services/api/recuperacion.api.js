// fetch directo (no apiFetch): son endpoints públicos sin sesión. No se envía el JWT y un 401
// no debe purgar nada. Devuelve { ok, status, data, message }; solo lanza si falla la red.
async function postPublico(path, cuerpo) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json.data, message: json.message, details: json.details };
}

export function solicitarRecuperacion(email) {
  return postPublico('/api/auth/recuperar', { email });
}

export function restablecerContrasena(token, password) {
  return postPublico('/api/auth/restablecer', { token, password });
}

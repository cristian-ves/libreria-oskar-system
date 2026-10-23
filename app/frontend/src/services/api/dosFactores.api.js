import { apiFetch } from './client';

// Pasos del login con token TEMPORAL: fetch directo (no apiFetch). El token temporal no está
// en tokenStorage y un 401 aquí (código o token vencido) no debe purgar la sesión ni redirigir:
// lo maneja el flujo de Login.
function postTemporal(path, tokenTemporal, body) {
  return fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenTemporal}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function configurarDosFactores(tokenTemporal) {
  return postTemporal('/api/auth/2fa/configurar', tokenTemporal);
}

export function activarDosFactores(tokenTemporal, codigo) {
  return postTemporal('/api/auth/2fa/activar', tokenTemporal, { codigo });
}

/** cuerpo: { codigo } o { codigoRespaldo } (exactamente uno). */
export function verificarDosFactores(tokenTemporal, cuerpo) {
  return postTemporal('/api/auth/2fa/verificar', tokenTemporal, cuerpo);
}

// Con sesión completa: apiFetch (inyecta el JWT). Un código inválido al regenerar
// responde 400 a propósito, así que el 401 de apiFetch solo llega si la sesión venció.
export function getEstadoDosFactores() {
  return apiFetch('/api/auth/2fa/estado');
}

export function regenerarCodigosRespaldo(codigo) {
  return apiFetch('/api/auth/2fa/respaldo/regenerar', {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  });
}

import { apiFetch } from './client';

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== '' && value !== undefined) search.set(key, value); });
  return search.toString();
};
const body = (method, payload) => ({ method, body: JSON.stringify(payload) });

export function getSucursales(params = {}, options = {}) {
  const qs = query(params);
  return apiFetch(`/api/sucursales${qs ? `?${qs}` : ''}`, options);
}
export function getSucursal(id, options = {}) { return apiFetch(`/api/sucursales/${encodeURIComponent(id)}`, options); }
export function crearSucursal(payload) { return apiFetch('/api/sucursales', body('POST', payload)); }
export function actualizarSucursal(id, payload) { return apiFetch(`/api/sucursales/${encodeURIComponent(id)}`, body('PUT', payload)); }
export function cambiarEstadoSucursal(id, activo) { return apiFetch(`/api/sucursales/${encodeURIComponent(id)}/activo`, body('PATCH', { activo })); }
export function getBodegasSucursal(id, params = {}, options = {}) {
  const qs = query(params);
  return apiFetch(`/api/sucursales/${encodeURIComponent(id)}/bodegas${qs ? `?${qs}` : ''}`, options);
}
export function crearBodega(sucursalId, payload) { return apiFetch(`/api/sucursales/${encodeURIComponent(sucursalId)}/bodegas`, body('POST', payload)); }
export function getBodega(id, options = {}) { return apiFetch(`/api/bodegas/${encodeURIComponent(id)}`, options); }
export function actualizarBodega(id, payload) { return apiFetch(`/api/bodegas/${encodeURIComponent(id)}`, body('PUT', payload)); }
export function cambiarEstadoBodega(id, activo) { return apiFetch(`/api/bodegas/${encodeURIComponent(id)}/activo`, body('PATCH', { activo })); }

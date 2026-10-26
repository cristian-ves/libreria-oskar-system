import { apiFetch } from './client';

const ENDPOINTS = {
  'corte-caja': '/api/reportes/corte-caja',
  'resumen-periodo': '/api/reportes/resumen-periodo',
  'libros-mas-vendidos': '/api/reportes/libros-mas-vendidos',
  reposicion: '/api/reportes/reposicion',
  'inventario-valorizado': '/api/reportes/inventario-valorizado',
  kardex: '/api/reportes/kardex',
  ventas: '/api/reportes/ventas',
  'stock-obsoleto': '/api/reportes/stock-obsoleto',
};

export function consultarOpcionesStockObsoleto(options = {}) {
  return apiFetch('/api/reportes/stock-obsoleto/opciones', options);
}

function queryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export function consultarReporte(tipo, params, options = {}) {
  const endpoint = ENDPOINTS[tipo];
  if (!endpoint) throw new Error('El reporte seleccionado no está disponible.');
  return apiFetch(`${endpoint}?${queryString(params)}`, options);
}

export function descargarReporte(tipo, params, formato, options = {}) {
  if (!ENDPOINTS[tipo]) throw new Error('El reporte seleccionado no está disponible.');
  return apiFetch(`/api/reportes/${encodeURIComponent(tipo)}/exportar?${queryString({ ...params, formato })}`, options);
}

import { apiFetch } from './client';

export function getBodegas(options = {}) {
  return apiFetch('/api/bodegas', options);
}

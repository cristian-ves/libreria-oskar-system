import { apiFetch } from './client';

export function getBodegas() {
  return apiFetch('/api/bodegas');
}

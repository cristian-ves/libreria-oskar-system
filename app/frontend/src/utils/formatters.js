export function formatFecha(dateString) {
  if (!dateString) return 'Sin salidas';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Sin salidas';
  return date.toLocaleString('es-GT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPrecio(precio) {
  return Number(precio) > 0 ? 'Q ' + Number(precio).toFixed(2) : 'Precio por confirmar';
}

export function formatFechaVenta(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

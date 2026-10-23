// Copiar y descargar sin dependencias. Nunca lanza: devuelve false si no se pudo.

/** Copia texto. navigator.clipboard no existe en contextos no seguros (HTTP por IP local). */
export async function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Sigue con el respaldo
    }
  }

  // Respaldo: textarea temporal + execCommand (obsoleto, pero funciona en HTTP)
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Descarga un .txt generado en memoria. */
export function descargarTexto(nombre, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

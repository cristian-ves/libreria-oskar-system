const FRONTEND_POR_DEFECTO = 'http://localhost:5173';

const CONSTANTES = Object.freeze({
  vencimientoMinutos: 30,
  enfriamientoMinutos: 2,
  recuperarMax: 5,
  restablecerMax: 10,
  ventanaLimiteMs: 15 * 60 * 1000,
});

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Mismo criterio que los orígenes de CORS: http(s), sin ruta, query ni barra final.
// Nunca se incluye el valor recibido en el mensaje.
function validarOrigen(valor) {
  let parsed;
  try { parsed = new URL(valor); } catch { parsed = null; }
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== valor) {
    throw new Error('FRONTEND_URL inválida: debe ser un origen http(s) sin ruta ni barra final.');
  }
  return valor;
}

// Función pura: no lee process.env ni escribe en consola.
// `faltantes` nombra variables (nunca valores); con faltantes el envío de enlaces queda inhabilitado.
function leerConfigRecuperacion(entorno = {}, nodeEnv = 'development') {
  // En pruebas siempre el origen local, sin importar el .env.
  const bruto = nodeEnv === 'test' ? FRONTEND_POR_DEFECTO : texto(entorno.FRONTEND_URL);
  const faltantes = [];
  let frontendUrl = null;
  if (bruto) frontendUrl = validarOrigen(bruto);
  else if (nodeEnv === 'production') faltantes.push('FRONTEND_URL');
  else frontendUrl = FRONTEND_POR_DEFECTO;
  return { ...CONSTANTES, frontendUrl, faltantes };
}

module.exports = { leerConfigRecuperacion, FRONTEND_POR_DEFECTO };

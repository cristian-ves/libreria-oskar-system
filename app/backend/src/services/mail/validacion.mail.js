const MAX_DESTINATARIOS = 20;
const MAX_ASUNTO = 200;
const MAX_CUERPO_BYTES = 100 * 1024;
const CRLF = /[\r\n]/;
const DIRECCION = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

function validarCuerpo(nombre, valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return `${nombre} debe ser texto`;
  if (Buffer.byteLength(valor) > MAX_CUERPO_BYTES) return `${nombre} supera 100 kB`;
  return null;
}

// Devuelve { ok: true, mensaje } normalizado o { ok: false, detalle }.
function validarMensaje(entrada) {
  if (!entrada || typeof entrada !== 'object') return { ok: false, detalle: 'mensaje ausente' };
  const { para, asunto, texto, html } = entrada;

  const destinos = Array.isArray(para) ? para : [para];
  if (destinos.length === 0 || destinos.length > MAX_DESTINATARIOS) {
    return { ok: false, detalle: `destinatarios: de 1 a ${MAX_DESTINATARIOS}` };
  }
  for (const destino of destinos) {
    if (typeof destino !== 'string' || CRLF.test(destino)) {
      return { ok: false, detalle: 'destinatario con formato o saltos de línea inválidos' };
    }
    if (!DIRECCION.test(destino.trim()) || destino.length > 254) {
      return { ok: false, detalle: 'destinatario mal formado' };
    }
  }

  if (typeof asunto !== 'string' || CRLF.test(asunto)) {
    return { ok: false, detalle: 'asunto ausente o con saltos de línea' };
  }
  if (!asunto.trim() || asunto.length > MAX_ASUNTO) {
    return { ok: false, detalle: `asunto vacío o de más de ${MAX_ASUNTO} caracteres` };
  }

  const errorCuerpo = validarCuerpo('texto', texto) || validarCuerpo('html', html);
  if (errorCuerpo) return { ok: false, detalle: errorCuerpo };
  if (!(texto && texto.trim()) && !(html && html.trim())) {
    return { ok: false, detalle: 'se requiere texto o html' };
  }

  return {
    ok: true,
    mensaje: { para: destinos.map((d) => d.trim()), asunto: asunto.trim(), texto, html },
  };
}

module.exports = { validarMensaje };

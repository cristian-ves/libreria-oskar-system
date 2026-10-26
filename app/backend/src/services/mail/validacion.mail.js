const MAX_DESTINATARIOS = 20;
const MAX_ASUNTO = 200;
const MAX_CUERPO_BYTES = 100 * 1024;
const CRLF = /[\r\n]/;
const DIRECCION = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
const MAX_ADJUNTOS = 3;
const MAX_ADJUNTO_BYTES = 100 * 1024;
const TIPOS_ADJUNTO = ['image/png', 'image/jpeg'];
const NOMBRE_SIMPLE = /^[A-Za-z0-9._-]{1,64}$/;

function validarCuerpo(nombre, valor) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return `${nombre} debe ser texto`;
  if (Buffer.byteLength(valor) > MAX_CUERPO_BYTES) return `${nombre} supera 100 kB`;
  return null;
}

function esDireccionValida(valor) {
  return typeof valor === 'string' && valor.length <= 254 && !CRLF.test(valor)
    && DIRECCION.test(valor.trim());
}

// Adjuntos en línea (imágenes referenciadas con cid:). Devuelve { lista } o { error }.
function validarAdjuntos(adjuntos) {
  if (adjuntos === undefined || adjuntos === null) return { lista: undefined };
  if (!Array.isArray(adjuntos) || adjuntos.length > MAX_ADJUNTOS) return { error: `adjuntos: hasta ${MAX_ADJUNTOS}` };
  for (const a of adjuntos) {
    if (!a || typeof a !== 'object') return { error: 'adjunto ausente' };
    if (typeof a.nombre !== 'string' || !NOMBRE_SIMPLE.test(a.nombre)) return { error: 'adjunto con nombre inválido' };
    if (typeof a.cid !== 'string' || !NOMBRE_SIMPLE.test(a.cid)) return { error: 'adjunto con cid inválido' };
    if (!TIPOS_ADJUNTO.includes(a.tipo)) return { error: 'adjunto de tipo no permitido' };
    if (!Buffer.isBuffer(a.contenido) || a.contenido.length === 0 || a.contenido.length > MAX_ADJUNTO_BYTES) {
      return { error: 'adjunto vacío o de más de 100 kB' };
    }
  }
  return { lista: adjuntos.map(({ nombre, contenido, tipo, cid }) => ({ nombre, contenido, tipo, cid })) };
}

// Devuelve { ok: true, mensaje } normalizado o { ok: false, detalle }.
function validarMensaje(entrada) {
  if (!entrada || typeof entrada !== 'object') return { ok: false, detalle: 'mensaje ausente' };
  const { para, asunto, texto, html, adjuntos } = entrada;

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
  const { lista, error } = validarAdjuntos(adjuntos);
  if (error) return { ok: false, detalle: error };

  return {
    ok: true,
    mensaje: {
      para: destinos.map((d) => d.trim()), asunto: asunto.trim(), texto, html, ...(lista ? { adjuntos: lista } : {}),
    },
  };
}

module.exports = { validarMensaje, esDireccionValida };

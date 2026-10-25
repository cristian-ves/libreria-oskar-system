// Plantilla HTML base de los correos: maqueta con tablas y estilos en línea, sin scripts,
// hojas externas ni fuentes web (los clientes de correo los ignoran o bloquean).
// Ninguna función lanza: un dato extraño se omite o se muestra como texto escapado.

const C = {
  fondo: '#f3f3f3', texto: '#252525', acento: '#e19922', dorado: '#e8c85e',
  oscuro: '#b07c19', borde: '#e5e7eb', gris: '#6b7280', blanco: '#ffffff',
};
const FUENTE = "font-family:'Fira Sans', Arial, Helvetica, sans-serif;";
const CID = /^[A-Za-z0-9._-]{1,64}$/;
const RELLENO_PREENCABEZADO = '&#847;&zwnj;&nbsp;'.repeat(40);

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escaparHtml(valor) {
  if (valor === undefined || valor === null) return '';
  let texto;
  try {
    texto = String(valor);
  } catch {
    return '';
  }
  return texto.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** Devuelve la URL solo si es http(s) y sin espacios ni controles; si no, null. */
function urlSegura(valor) {
  return typeof valor === 'string' && /^https?:\/\/[^\s\u0000-\u001f]+$/i.test(valor) ? valor : null;
}

const lista = (valor) => {
  if (Array.isArray(valor)) return valor;
  return valor === undefined || valor === null ? [] : [valor];
};

const parrafo = (texto, estilo = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;${estilo}">${escaparHtml(texto)}</p>`;

function encabezado(logoCid) {
  const logo = typeof logoCid === 'string' && CID.test(logoCid)
    ? `<td width="48" valign="middle" style="padding-right:12px;"><img src="cid:${escaparHtml(logoCid)}" width="48" height="48" alt="Librería Oskar" style="display:block;border:0;border-radius:50%;"></td>`
    : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${logo}`
    + `<td valign="middle" style="${FUENTE}font-size:20px;font-weight:700;color:${C.texto};">Librería `
    + `<span style="display:inline-block;background-color:${C.dorado};color:${C.texto};font-weight:700;border-radius:6px;padding:2px 8px;">Oskar</span>`
    + '</td></tr></table>';
}

function seccionBoton(boton) {
  if (!boton || typeof boton !== 'object') return '';
  const url = urlSegura(boton.url);
  if (!url) return boton.url ? parrafo(boton.url, 'word-break:break-all;') : '';
  const href = escaparHtml(url);
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>'
    + `<td align="center" bgcolor="${C.acento}" style="background-color:${C.acento};border-radius:8px;">`
    + `<a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;${FUENTE}font-size:16px;font-weight:700;color:${C.texto};text-decoration:none;border-radius:8px;border:1px solid ${C.oscuro};">${escaparHtml(boton.texto || 'Abrir enlace')}</a>`
    + '</td></tr></table>'
    + parrafo('Si el botón no funciona, copia y pega este enlace en tu navegador:', `font-size:13px;color:${C.gris};margin-bottom:4px;`)
    + `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" target="_blank" rel="noopener" style="color:${C.oscuro};">${href}</a></p>`;
}

/**
 * Documento HTML completo con el diseño de la página. Solo incluye la imagen del logo
 * (por `cid:`) si se recibe `logoCid`; sin él, el encabezado es solo texto.
 * @returns {string}
 */
function plantillaCorreo(datos) {
  const {
    preencabezado, titulo, saludo, parrafos, boton, notas, pie, logoCid,
  } = datos && typeof datos === 'object' ? datos : {};
  const cuerpo = [
    titulo ? `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.texto};">${escaparHtml(titulo)}</h1>` : '',
    saludo ? parrafo(saludo) : '',
    ...lista(parrafos).map((p) => parrafo(p)),
    seccionBoton(boton),
    ...lista(notas).map((n) => parrafo(n, `font-size:14px;color:${C.gris};`)),
  ].join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escaparHtml(titulo || 'Librería Oskar')}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.fondo};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.fondo};">${escaparHtml(preencabezado)}${RELLENO_PREENCABEZADO}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.fondo}" style="width:100%;background-color:${C.fondo};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 4px 16px;">${encabezado(logoCid)}</td></tr>
<tr><td bgcolor="${C.blanco}" style="background-color:${C.blanco};border:1px solid ${C.borde};border-radius:12px;padding:28px 24px;${FUENTE}color:${C.texto};">${cuerpo}</td></tr>
<tr><td align="center" style="padding:16px 4px;${FUENTE}font-size:12px;line-height:1.5;color:${C.gris};"><strong style="color:${C.texto};">Librería Oskar</strong><br>${escaparHtml(pie || 'Este es un mensaje automático; no hace falta responderlo.')}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}

module.exports = { plantillaCorreo, escaparHtml, urlSegura, COLORES: C };

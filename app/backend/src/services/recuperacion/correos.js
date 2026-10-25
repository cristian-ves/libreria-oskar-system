// Mensajes de la recuperación de contraseña: texto plano (respaldo) y HTML con el diseño
// de la página y el logo en línea; asuntos de una línea.
const { plantillaCorreo } = require('../mail/plantillas');
const { adjuntoLogo, cargarLogo: cargarLogoPorDefecto } = require('../mail/logo');

/** El token va en el fragmento (#), que el navegador no envía a servidores ni en Referer. */
const enlaceRestablecer = (frontendUrl, token) => `${frontendUrl}/restablecer#token=${token}`;

// Añade el html y el adjunto del logo; sin logo, encabezado de texto y `adjuntos: []`.
function conDiseno(mensaje, contenido, cargarLogo = cargarLogoPorDefecto) {
  const logo = adjuntoLogo(cargarLogo);
  return {
    ...mensaje,
    html: plantillaCorreo({ ...contenido, logoCid: logo ? logo.cid : undefined }),
    adjuntos: logo ? [logo] : [],
  };
}

function mensajeEnlace({ usuario, enlace, vencimientoMinutos, cargarLogo }) {
  const vencimiento = `El enlace vence en ${vencimientoMinutos} minutos y solo puede usarse una vez.`;
  return conDiseno({
    para: usuario.email,
    asunto: 'Restablece tu contraseña - Librería Oskar',
    texto: [
      `Hola, ${usuario.nombre_completo}:`,
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Librería Oskar.',
      'Abre este enlace para elegir una contraseña nueva:',
      '',
      enlace,
      '',
      vencimiento,
      'Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.',
      'Si tienes dudas, escribe al administrador del sistema.',
    ].join('\n'),
  }, {
    preencabezado: 'Elige una contraseña nueva para tu cuenta.',
    titulo: 'Restablece tu contraseña',
    saludo: `Hola, ${usuario.nombre_completo}:`,
    parrafos: [
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Librería Oskar.',
      `Pulsa el botón para elegir una contraseña nueva. ${vencimiento}`,
    ],
    boton: { texto: 'Restablecer contraseña', url: enlace },
    notas: [
      'Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.',
      'Si tienes dudas, escribe al administrador del sistema.',
    ],
  }, cargarLogo);
}

function mensajeAviso({ usuario, cargarLogo }) {
  return conDiseno({
    para: usuario.email,
    asunto: 'Se cambió tu contraseña - Librería Oskar',
    texto: [
      `Hola, ${usuario.nombre_completo}:`,
      '',
      'Se cambió la contraseña de tu cuenta en Librería Oskar y se cerraron las sesiones anteriores.',
      'Si no fuiste tú, contacta al administrador del sistema de inmediato.',
    ].join('\n'),
  }, {
    preencabezado: 'La contraseña de tu cuenta se cambió.',
    titulo: 'Se cambió tu contraseña',
    saludo: `Hola, ${usuario.nombre_completo}:`,
    parrafos: [
      'Se cambió la contraseña de tu cuenta en Librería Oskar y se cerraron las sesiones anteriores.',
      'Si no fuiste tú, contacta al administrador del sistema de inmediato.',
    ],
  }, cargarLogo);
}

module.exports = { enlaceRestablecer, mensajeEnlace, mensajeAviso };

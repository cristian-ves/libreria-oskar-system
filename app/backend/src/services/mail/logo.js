const fs = require('fs');
const path = require('path');

// Logo circular de los correos (144x144, se muestra a 48x48). Viaja incrustado como
// adjunto en línea (cid) porque un correo no puede cargar imágenes de localhost.
const RUTA_LOGO = path.join(__dirname, '..', '..', 'assets', 'logo-correo.png');
const LOGO_CID = 'logo.libreria-oskar';

/** Devuelve un cargador que lee el PNG una sola vez; si falta o falla, devuelve null (nunca lanza). */
function crearCargadorLogo(ruta = RUTA_LOGO, logger = console) {
  let cache;
  return function cargar() {
    if (cache !== undefined) return cache;
    try {
      const contenido = fs.readFileSync(ruta);
      cache = contenido.length > 0 ? contenido : null;
    } catch {
      cache = null;
    }
    if (cache === null) {
      try {
        logger.warn('[MAIL] Logo de los correos no disponible: se enviarán sin logo.');
      } catch {
        // un logger roto no debe romper la construcción del correo
      }
    }
    return cache;
  };
}

const cargarLogo = crearCargadorLogo();

/** Adjunto en línea del logo para el módulo de correo, o null si no está disponible. */
function adjuntoLogo(cargar = cargarLogo) {
  let contenido = null;
  try {
    contenido = cargar();
  } catch {
    contenido = null;
  }
  if (!Buffer.isBuffer(contenido)) return null;
  return { nombre: 'logo-oskar.png', contenido, tipo: 'image/png', cid: LOGO_CID };
}

module.exports = { crearCargadorLogo, cargarLogo, adjuntoLogo, LOGO_CID };

// Vista previa local de los correos de recuperación: npm run correo:vista-previa [-- directorio]
// No envía nada, no lee .env, no toca la BD ni la red. Datos ficticios.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { leerConfigRecuperacion, FRONTEND_POR_DEFECTO } = require('../config/recuperacion.config');
const { enlaceRestablecer, mensajeEnlace, mensajeAviso } = require('../services/recuperacion/correos');

function main() {
  const config = leerConfigRecuperacion(process.env, process.env.NODE_ENV || 'development');
  const usuario = { email: 'ana.perez@example.test', nombre_completo: 'Ana Pérez' };
  const enlace = enlaceRestablecer(config.frontendUrl || FRONTEND_POR_DEFECTO, 'A'.repeat(43)); // token FALSO
  const destino = path.resolve(process.argv[2] || os.tmpdir());
  fs.mkdirSync(destino, { recursive: true });

  const correos = {
    'correo-recuperacion.html': mensajeEnlace({ usuario, enlace, vencimientoMinutos: config.vencimientoMinutos }),
    'correo-aviso.html': mensajeAviso({ usuario }),
  };
  for (const [nombre, mensaje] of Object.entries(correos)) {
    // Un navegador no entiende cid:; solo en este archivo local el logo va como data: URI.
    const html = mensaje.adjuntos.reduce(
      (acc, a) => acc.split(`cid:${a.cid}`).join(`data:${a.tipo};base64,${a.contenido.toString('base64')}`),
      mensaje.html,
    );
    const ruta = path.join(destino, nombre);
    fs.writeFileSync(ruta, html);
    console.log(`${ruta} — html ${Buffer.byteLength(mensaje.html)} bytes (correo), `
      + `${Buffer.byteLength(html)} bytes (vista previa), adjuntos: ${mensaje.adjuntos.length}`);
  }
}

main();

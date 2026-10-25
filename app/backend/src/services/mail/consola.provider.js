const { enmascarar } = require('./seguridad.mail');

const MAX_BANDEJA = 100;

// Proveedor para desarrollo y pruebas: guarda el mensaje en memoria y no envía nada.
function crearProveedorConsola({ nodeEnv = 'development', logger = console, from = '' } = {}) {
  const bandeja = [];

  return {
    nombre: 'consola',
    bandeja,
    vaciarBandeja() {
      bandeja.length = 0;
    },
    async enviar(mensaje) {
      // De los adjuntos solo se guardan metadatos y tamaño, nunca el contenido.
      const { adjuntos, ...resto } = mensaje;
      const entrada = { ...resto, from, fecha: new Date() };
      if (adjuntos) {
        entrada.adjuntos = adjuntos.map(({ nombre, tipo, cid, contenido }) => ({ nombre, tipo, cid, bytes: contenido.length }));
      }
      bandeja.push(entrada);
      if (bandeja.length > MAX_BANDEJA) bandeja.shift();
      if (nodeEnv === 'test') return;
      const destinos = mensaje.para.map(enmascarar).join(', ');
      logger.log(`[MAIL] (consola) Para: ${destinos} | Asunto: ${mensaje.asunto}`);
      // Solo el texto plano: el html y los adjuntos nunca se imprimen.
      if (nodeEnv === 'development' && mensaje.texto) logger.log(`[MAIL] (consola) Cuerpo:\n${mensaje.texto}`);
    },
    async verificar() {
      return true;
    },
  };
}

module.exports = { crearProveedorConsola, MAX_BANDEJA };

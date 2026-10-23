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
      bandeja.push({ ...mensaje, from, fecha: new Date() });
      if (bandeja.length > MAX_BANDEJA) bandeja.shift();
      if (nodeEnv === 'test') return;
      const destinos = mensaje.para.map(enmascarar).join(', ');
      logger.log(`[MAIL] (consola) Para: ${destinos} | Asunto: ${mensaje.asunto}`);
      if (nodeEnv === 'development') logger.log(`[MAIL] (consola) Cuerpo:\n${mensaje.texto || mensaje.html}`);
    },
    async verificar() {
      return true;
    },
  };
}

module.exports = { crearProveedorConsola, MAX_BANDEJA };

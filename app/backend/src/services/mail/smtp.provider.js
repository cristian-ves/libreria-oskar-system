const TIMEOUTS_MS = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 };

const crearTransporteNodemailer = (opciones) => require('nodemailer').createTransport(opciones);

// Proveedor SMTP sobre Nodemailer. `crearTransporte` se inyecta para probarlo sin red.
function crearProveedorSmtp(config, { crearTransporte = crearTransporteNodemailer } = {}) {
  const secure = config.port === 465;
  const transporter = crearTransporte({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: { user: config.user, pass: config.password },
    ...TIMEOUTS_MS,
  });
  const from = config.from || config.user;

  // Configuración incompleta: falla sin tocar la red y sin reintentos (no se arregla sola).
  function exigirConfig() {
    if (config.faltantes && config.faltantes.length > 0) {
      const error = new Error(`Configuración SMTP incompleta: faltan ${config.faltantes.join(', ')}`);
      error.permanente = true;
      throw error;
    }
  }

  return {
    nombre: 'smtp',
    async enviar(mensaje) {
      exigirConfig();
      const correo = {
        from,
        to: mensaje.para,
        subject: mensaje.asunto,
        text: mensaje.texto,
        html: mensaje.html,
      };
      // Imágenes en línea: Nodemailer las pone en multipart/related junto al html (por su cid).
      if (mensaje.adjuntos && mensaje.adjuntos.length > 0) {
        correo.attachments = mensaje.adjuntos.map((a) => ({
          filename: a.nombre, content: a.contenido, contentType: a.tipo, cid: a.cid, contentDisposition: 'inline',
        }));
      }
      return transporter.sendMail(correo);
    },
    async verificar() {
      exigirConfig();
      return transporter.verify();
    },
  };
}

module.exports = { crearProveedorSmtp };

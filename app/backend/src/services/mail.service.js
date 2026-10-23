const env = require('../config/env');
const { crearServicioCorreo } = require('./mail/fabrica.service');
const { crearProveedorSmtp } = require('./mail/smtp.provider');
const { crearProveedorConsola } = require('./mail/consola.provider');

// Fachada: los consumidores importan este archivo y usan `enviar`; el proveedor
// (smtp o consola) se elige con MAIL_PROVIDER sin tocar a quien envía.
const { mail } = env;
const proveedor = mail.proveedor === 'smtp'
  ? crearProveedorSmtp(mail)
  : crearProveedorConsola({ nodeEnv: env.NODE_ENV, from: mail.from });

const servicio = crearServicioCorreo({ proveedor, secretos: [mail.password] });

module.exports = { ...servicio, crearServicioCorreo };

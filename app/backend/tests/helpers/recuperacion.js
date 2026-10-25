const crypto = require('node:crypto');
const mailService = require('../../src/services/mail.service');
const recuperacionService = require('../../src/services/recuperacion.service');
// Mismas instancias que monta auth.routes.js (caché de módulos de Node).
const { limiteRecuperar, limiteRestablecer } = require('../../src/middlewares/rateLimitRecuperacion');
const { Usuario, sequelize } = require('../../src/models');

const NUEVA = 'NuevaClave2026';
const reiniciarLimites = () => { limiteRecuperar.reset(); limiteRestablecer.reset(); };
const sha256 = (valor) => crypto.createHash('sha256').update(valor).digest('hex');
const tokenDe = (mensaje) => /#token=([A-Za-z0-9_-]{43})$/m.exec(mensaje?.texto || '')?.[1];

/** Correos de la bandeja de consola dirigidos a `email`, tras esperar los envíos en curso. */
async function correosPara(email) {
  await recuperacionService.esperarEnvios();
  return mailService.bandeja.filter((m) => m.para.includes(email));
}

/** Envoltura de `srv.api` que reinicia los límites de recuperación antes de cada petición. */
const conLimitesLibres = (srv) => (metodo, ruta, opciones) => {
  reiniciarLimites();
  return srv.api(metodo, ruta, opciones);
};

const recuperar = (srv, email) => conLimitesLibres(srv)('POST', '/auth/recuperar', { body: { email } });
const restablecer = (srv, token, password = NUEVA) =>
  conLimitesLibres(srv)('POST', '/auth/restablecer', { body: { token, password } });

/** Solicita un enlace y devuelve el token del último correo recibido por `email`. */
async function solicitarToken(srv, email) {
  const res = await recuperar(srv, email);
  if (res.status !== 200) throw new Error(`recuperar respondió ${res.status}`);
  return tokenDe((await correosPara(email)).at(-1));
}

/** Simula que el último enlace se emitió hace `minutos` (vencimiento a 30 - minutos). */
const envejecerEnlace = (usuarioId, minutos) => Usuario.update(
  { token_recuperacion_expira: sequelize.literal(`CURRENT_TIMESTAMP + make_interval(mins => ${30 - minutos})`) },
  { where: { id: usuarioId } }
);

/** Lleva password_cambiada_en 2 s al pasado: un JWT firmado ahora queda posterior al cambio sin esperar. */
const adelantarCambio = (usuarioId) => Usuario.update(
  { password_cambiada_en: sequelize.literal("password_cambiada_en - interval '2 seconds'") },
  { where: { id: usuarioId } }
);

module.exports = {
  NUEVA,
  reiniciarLimites,
  sha256,
  tokenDe,
  correosPara,
  conLimitesLibres,
  recuperar,
  restablecer,
  solicitarToken,
  envejecerEnlace,
  adelantarCambio,
};

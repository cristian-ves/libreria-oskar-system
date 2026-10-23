const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSync } = require('otplib');
const app = require('../../src/app');
const appEnv = require('../../src/config/env');
// Misma instancia que monta auth.routes.js (caché de módulos de Node).
const loginRateLimit = require('../../src/middlewares/rateLimit');
const { Rol, Usuario, CodigoRespaldo } = require('../../src/models');
const dosFactoresService = require('../../src/services/dosFactores.service');

const PASSWORD = 'Prueba2FA!';
let hashPassword;

/**
 * Fábrica de usuarios propios de las pruebas 2FA (nunca toca los del seed) y su limpieza.
 */
function crearFabrica(etiqueta) {
  const tag = `${etiqueta}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const ids = [];
  let contador = 0;

  async function crear(rolNombre, extra = {}) {
    hashPassword = hashPassword || (await bcrypt.hash(PASSWORD, 4));
    const rol = await Rol.findOne({ where: { nombre: rolNombre } });
    if (!rol) throw new Error(`Debe existir el rol ${rolNombre}`);
    contador += 1;
    const usuario = await Usuario.create({
      rol_id: rol.id,
      nombre_completo: `${rolNombre} 2FA ${tag} ${contador}`,
      email: `${rolNombre.toLowerCase()}-${contador}-${tag}@example.test`,
      password_hash: hashPassword,
      ...extra,
    });
    ids.push(usuario.id);
    return usuario;
  }

  // codigos_respaldo_2fa cae en cascada al borrar el usuario.
  const limpiar = () => Usuario.destroy({ where: { id: ids } });
  return { crear, limpiar };
}

async function levantarServidor() {
  let server;
  const baseUrl = await new Promise((resolve) => {
    server = app.listen(0, () => resolve(`http://localhost:${server.address().port}/api`));
  });

  async function api(metodo, ruta, { token, body } = {}) {
    // Cada login de estas pruebas parte con el contador del limitador en cero.
    if (metodo === 'POST' && ruta === '/auth/login') loginRateLimit.reset();
    const res = await fetch(`${baseUrl}${ruta}`, {
      method: metodo,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, json: await res.json(), headers: res.headers };
  }

  const login = (email, password = PASSWORD) => api('POST', '/auth/login', { body: { email, password } });
  const cerrar = () => new Promise((resolve) => server.close(resolve));
  return { api, login, cerrar };
}

const tokenSesion = (usuario) => jwt.sign({ sub: usuario.id }, appEnv.jwt.secret, { expiresIn: '10m' });
const tokenTemporal = (usuario, scope, opciones = { expiresIn: '10m' }) =>
  jwt.sign({ sub: usuario.id, scope }, appEnv.jwt.secret, opciones);

/** Código TOTP del paso actual (o de otro instante, en segundos Unix). */
const codigoTotp = (secreto, epoch = Date.now() / 1000) => generateSync({ secret: secreto, epoch: Math.floor(epoch) });

/** Código de 6 dígitos que no coincide con ningún paso de la ventana actual (±2). */
function codigoErroneo(secreto) {
  const ahora = Date.now() / 1000;
  const ventana = [-2, -1, 0, 1, 2].map((d) => codigoTotp(secreto, ahora + d * 30));
  for (let i = 0; ; i += 1) {
    const candidato = String((123456 + i * 7919) % 1000000).padStart(6, '0');
    if (!ventana.includes(candidato)) return candidato;
  }
}

/** Permite reutilizar el paso actual en la siguiente verificación (solo usuarios de prueba). */
const olvidarPaso = (usuarioId) => Usuario.update({ dos_factores_ultimo_paso: null }, { where: { id: usuarioId } });

/** Ejecuta `fn` con el 2FA obligatorio y restaura la bandera al terminar. */
async function conObligatorio(fn) {
  const previo = appEnv.twoFactor.enforced;
  appEnv.twoFactor.enforced = true;
  try {
    return await fn();
  } finally {
    appEnv.twoFactor.enforced = previo;
  }
}

/** Da de alta el 2FA por la capa de servicio y deja libre el paso usado. */
async function activarDirecto(usuario) {
  const { secretoManual } = await dosFactoresService.configurar(usuario.id);
  const { codigosRespaldo } = await dosFactoresService.activar(usuario.id, codigoTotp(secretoManual));
  await olvidarPaso(usuario.id);
  return { secreto: secretoManual, codigosRespaldo };
}

const estadoBd = (usuarioId) => Usuario.findByPk(usuarioId, { raw: true });
const respaldosBd = (usuarioId) => CodigoRespaldo.findAll({ where: { usuario_id: usuarioId }, raw: true });

module.exports = {
  PASSWORD,
  crearFabrica,
  levantarServidor,
  tokenSesion,
  tokenTemporal,
  codigoTotp,
  codigoErroneo,
  olvidarPaso,
  conObligatorio,
  activarDirecto,
  estadoBd,
  respaldosBd,
};

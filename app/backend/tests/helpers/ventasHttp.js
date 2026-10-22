const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const appEnv = require('../../src/config/env');

const firmar = (usuario) => jwt.sign({ sub: usuario.id }, appEnv.jwt.secret, { expiresIn: '10m' });

/**
 * Levanta el servidor Express temporal y devuelve un cliente HTTP con tokens por rol
 * (JWT firmados para los usuarios del entorno de pruebas).
 */
async function levantarApi(env) {
  const tokens = {
    admin: firmar(env.usuarios.Administrador),
    empleado: firmar(env.usuarios.Empleado),
    usuario: firmar(env.usuarios.Usuario),
  };
  let server;
  const baseUrl = await new Promise((resolve) => {
    server = app.listen(0, () => resolve(`http://localhost:${server.address().port}/api`));
  });

  async function api(metodo, ruta, { token, body } = {}) {
    const res = await fetch(`${baseUrl}${ruta}`, {
      method: metodo,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, json: await res.json() };
  }

  const cuerpo = (items, extra = {}) => ({
    bodegaId: env.bodega.id, metodoPago: 'Efectivo', items, ...extra,
  });
  const postVenta = (body, token = tokens.empleado) => api('POST', '/ventas', { token, body });
  const cerrar = () => new Promise((resolve) => server.close(resolve));

  return { api, tokens, cuerpo, postVenta, cerrar };
}

module.exports = { levantarApi };

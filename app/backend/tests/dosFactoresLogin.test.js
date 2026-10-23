const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const appEnv = require('../src/config/env');
const { sequelize, Usuario } = require('../src/models');
const {
  PASSWORD, crearFabrica, levantarServidor, tokenSesion, tokenTemporal, conObligatorio,
} = require('./helpers/dosFactores');

let fabrica;
let srv;
const u = {};

before(async () => {
  fabrica = crearFabrica('2fa-login');
  u.admin = await fabrica.crear('Administrador');
  u.empleado = await fabrica.crear('Empleado');
  u.usuario = await fabrica.crear('Usuario');
  u.inactivo = await fabrica.crear('Empleado', { activo: false });
  srv = await levantarServidor();
});

after(async () => {
  try {
    await srv.cerrar();
    await fabrica.limpiar();
  } finally {
    await sequelize.close();
  }
});

const sinToken = (data) => !('token' in data) && !('usuario' in data);

test('login: sin 2FA y bandera apagada responde igual que hoy', async () => {
  assert.equal(appEnv.twoFactor.enforced, false);
  for (const usuario of [u.admin, u.empleado, u.usuario]) {
    const res = await srv.login(usuario.email);
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'success');
    assert.deepEqual(Object.keys(res.json.data).sort(), ['token', 'usuario']);
    assert.deepEqual(Object.keys(res.json.data.usuario).sort(), ['email', 'id', 'nombre_completo', 'rol']);
    const payload = jwt.decode(res.json.data.token);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'nombre', 'rol', 'sub']);
  }
});

test('login: con 2FA obligatorio, Administrador y Empleado sin alta reciben paso configurar sin token', async () => {
  await conObligatorio(async () => {
    for (const usuario of [u.admin, u.empleado]) {
      const res = await srv.login(usuario.email);
      assert.equal(res.status, 200);
      const { data } = res.json;
      assert.deepEqual(Object.keys(data).sort(), ['expiraEnSegundos', 'paso', 'tokenTemporal']);
      assert.equal(data.paso, 'configurar');
      assert.equal(data.expiraEnSegundos, 600);
      assert.ok(sinToken(data));
      const payload = jwt.verify(data.tokenTemporal, appEnv.jwt.secret);
      assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'scope', 'sub']);
      assert.equal(payload.scope, '2fa-setup');
      assert.equal(payload.sub, usuario.id);
      assert.equal(payload.exp - payload.iat, 600);
    }
  });
});

test('login: el rol Usuario nunca debe configurar 2FA, aunque sea obligatorio', async () => {
  await conObligatorio(async () => {
    const res = await srv.login(u.usuario.email);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.json.data).sort(), ['token', 'usuario']);
  });
});

test('login: con 2FA activo (cualquier rol, bandera apagada) pide verificar y no entrega token', async () => {
  for (const usuario of [u.usuario, u.empleado]) {
    await Usuario.update({ dos_factores_activo: true }, { where: { id: usuario.id } });
    try {
      const res = await srv.login(usuario.email);
      assert.equal(res.status, 200);
      assert.equal(res.json.data.paso, 'verificar');
      assert.ok(sinToken(res.json.data));
      assert.equal(jwt.decode(res.json.data.tokenTemporal).scope, '2fa-verify');
    } finally {
      await Usuario.update({ dos_factores_activo: false }, { where: { id: usuario.id } });
    }
  }
});

test('login: clave errónea, email inexistente e inactivo mantienen los errores de hoy', async () => {
  await conObligatorio(async () => {
    const mala = await srv.login(u.admin.email, 'otra-clave');
    assert.equal(mala.status, 401);
    assert.equal(mala.json.message, 'Credenciales inválidas');
    const inexistente = await srv.login('nadie-2fa@example.test');
    assert.equal(inexistente.status, 401);
    assert.equal(inexistente.json.message, 'Credenciales inválidas');
    const inactivo = await srv.login(u.inactivo.email, PASSWORD);
    assert.equal(inactivo.status, 401);
    assert.equal(inactivo.json.message, 'El usuario se encuentra inactivo.');
    const faltan = await srv.api('POST', '/auth/login', { body: { email: u.admin.email } });
    assert.equal(faltan.status, 400);
  });
});

test('alcance: los tokens temporales no abren /auth/me ni endpoints de negocio', async () => {
  for (const scope of ['2fa-verify', '2fa-setup']) {
    const token = tokenTemporal(u.admin, scope);
    for (const ruta of ['/auth/me', '/usuarios', '/auth/2fa/estado']) {
      const res = await srv.api('GET', ruta, { token });
      assert.equal(res.status, 401, `${scope} en ${ruta}`);
    }
  }
  // Cualquier claim scope se rechaza, incluso uno desconocido.
  assert.equal((await srv.api('GET', '/auth/me', { token: tokenTemporal(u.admin, 'otro') })).status, 401);
});

test('alcance: un token sin scope sigue funcionando', async () => {
  const res = await srv.api('GET', '/auth/me', { token: tokenSesion(u.admin) });
  assert.equal(res.status, 200);
  assert.equal(res.json.data.id, u.admin.id);
});

test('alcance: cada paso 2FA exige su scope exacto', async () => {
  const body = { codigo: '123456' };
  const casos = [
    ['/auth/2fa/verificar', tokenSesion(u.admin)],
    ['/auth/2fa/verificar', tokenTemporal(u.admin, '2fa-setup')],
    ['/auth/2fa/configurar', tokenTemporal(u.admin, '2fa-verify')],
    ['/auth/2fa/activar', tokenTemporal(u.admin, '2fa-verify')],
    ['/auth/2fa/configurar', tokenSesion(u.admin)],
    ['/auth/2fa/verificar', undefined],
  ];
  for (const [ruta, token] of casos) {
    const res = await srv.api('POST', ruta, { token, body });
    assert.equal(res.status, 401, ruta);
    assert.equal(res.json.status, 'fail');
  }
});

test('alcance: token temporal vencido o de usuario inactivo → 401', async () => {
  const yaVencido = jwt.sign(
    { sub: u.admin.id, scope: '2fa-setup', exp: Math.floor(Date.now() / 1000) - 10 },
    appEnv.jwt.secret
  );
  const res = await srv.api('POST', '/auth/2fa/configurar', { token: yaVencido });
  assert.equal(res.status, 401);
  assert.match(res.json.message, /expirado/);

  const inactivo = await srv.api('POST', '/auth/2fa/configurar', { token: tokenTemporal(u.inactivo, '2fa-setup') });
  assert.equal(inactivo.status, 401);
});

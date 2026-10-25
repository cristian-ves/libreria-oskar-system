const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/models');
const seed = require('../src/database/seed');

const NOMBRE_ADMIN = 'Administración Librería Oskar';
const VARS = ['NODE_ENV', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_EMPLEADO_PASSWORD'];
const FIJOS = ['admin@libreriaoskar.com', 'empleado@libreriaoskar.com'];

const sufijo = () => crypto.randomBytes(6).toString('hex');
const nuevoCorreo = (prefijo = 'seedprod') => `${prefijo}-${sufijo()}@example.test`;
const nuevaClave = () => `Clv${sufijo()}9x`;

const query = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const usuarioPorCorreo = async (email) => (await query(
  `SELECT u.id, u.email, u.password_hash, u.activo, u.nombre_completo, u.dos_factores_activo, r.nombre AS rol
   FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE LOWER(u.email) = LOWER(:email)`, { email }
))[0];
const contarCentral = async () => ({
  sucursales: (await query("SELECT count(*)::int AS n FROM sucursales WHERE nombre = 'Sucursal Central'"))[0].n,
  bodegas: (await query("SELECT count(*)::int AS n FROM bodegas WHERE nombre = 'Bodega Principal'"))[0].n,
});
const filasFijas = () => query('SELECT * FROM usuarios WHERE email = ANY(ARRAY[:emails]) ORDER BY email', { emails: FIJOS });

// Ejecuta fn con NODE_ENV=production y las SEED_* dadas; restaura todo en finally (también las que no existían).
async function enProduccion(vars, fn) {
  const previo = Object.fromEntries(VARS.map((k) => [k, Object.prototype.hasOwnProperty.call(process.env, k) ? process.env[k] : undefined]));
  const consola = { log: console.log, warn: console.warn, error: console.error };
  const salida = [];
  const capturar = (...args) => { salida.push(args.map(String).join(' ')); };
  try {
    process.env.NODE_ENV = 'production';
    for (const k of VARS.slice(1)) {
      if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k];
    }
    console.log = capturar; console.warn = capturar; console.error = capturar;
    return await fn(salida);
  } finally {
    Object.assign(console, consola);
    for (const k of VARS) {
      if (previo[k] === undefined) delete process.env[k]; else process.env[k] = previo[k];
    }
  }
}

const correr = (vars) => enProduccion(vars, async (salida) => {
  try {
    return { resultado: await seed(), salida };
  } catch (error) {
    return { error, salida };
  }
});

test('seed en producción: Administrador central', async (t) => {
  const creados = [];
  const central = await contarCentral();
  const fijosAntes = await filasFijas();
  const correo = (prefijo) => { const e = nuevoCorreo(prefijo); creados.push(e); return e; };

  t.after(async () => {
    if (creados.length) await sequelize.query('DELETE FROM usuarios WHERE LOWER(email) = ANY(ARRAY[:emails])', { replacements: { emails: creados.map((e) => e.toLowerCase()) } });
    const ahora = await contarCentral();
    if (central.bodegas === 0 && ahora.bodegas > 0) await sequelize.query("DELETE FROM bodegas WHERE nombre = 'Bodega Principal'");
    if (central.sucursales === 0 && ahora.sucursales > 0) await sequelize.query("DELETE FROM sucursales WHERE nombre = 'Sucursal Central'");
    assert.deepEqual(await filasFijas(), fijosAntes, 'admin y empleado fijos no deben cambiar');
  });

  await t.test('crea el Administrador con rol, nombre fijo y hash válido', async () => {
    const email = correo(); const clave = nuevaClave();
    const { resultado, error } = await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: clave });
    assert.equal(error, undefined);
    const u = await usuarioPorCorreo(email);
    assert.ok(u);
    assert.equal(resultado.adminId, u.id);
    assert.equal(u.rol, 'Administrador');
    assert.equal(u.activo, true);
    assert.equal(u.dos_factores_activo, false);
    assert.equal(u.nombre_completo, NOMBRE_ADMIN);
    assert.equal(await bcrypt.compare(clave, u.password_hash), true);
  });

  await t.test('una segunda ejecución con otra contraseña no modifica al existente', async () => {
    const email = correo(); const clave = nuevaClave();
    await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: clave });
    const antes = await usuarioPorCorreo(email);
    const { resultado, error } = await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: nuevaClave() });
    assert.equal(error, undefined);
    const despues = await usuarioPorCorreo(email);
    assert.equal(resultado.adminId, antes.id);
    assert.deepEqual(despues, antes);
    assert.equal(await bcrypt.compare(clave, despues.password_hash), true);
  });

  await t.test('existente inactivo con rol Empleado: avisa, no falla y no cambia nada', async () => {
    const email = correo(); const hash = await bcrypt.hash(nuevaClave(), 4);
    await sequelize.query(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, activo)
       VALUES ((SELECT id FROM roles WHERE nombre = 'Empleado'), 'Empleado de prueba', :email, :hash, false)`,
      { replacements: { email, hash } }
    );
    const antes = await usuarioPorCorreo(email);
    const { resultado, error, salida } = await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: nuevaClave() });
    assert.equal(error, undefined);
    assert.equal(resultado.adminId, antes.id);
    assert.deepEqual(await usuarioPorCorreo(email), antes);
    assert.ok(salida.some((l) => l.includes('[SEED AVISO]') && l.includes(email)));
  });

  await t.test('correo ausente o inválido rechaza', async () => {
    for (const valor of [undefined, '', '   ', 'sin-arroba', 'a@b', 'con espacio@example.test', `${'a'.repeat(150)}@example.test`]) {
      const { error } = await correr({ SEED_ADMIN_EMAIL: valor, SEED_ADMIN_PASSWORD: nuevaClave() });
      assert.ok(error, `debe rechazar ${JSON.stringify(valor && valor.slice(0, 20))}`);
      assert.match(error.message, /SEED_ADMIN_EMAIL/);
    }
  });

  await t.test('contraseña ausente o débil con correo nuevo rechaza y revierte todo', async () => {
    const antes = await contarCentral();
    for (const clave of [undefined, '', 'corta1', 'SoloLetrasLargas', '1234567890123']) {
      const email = correo();
      const { error } = await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: clave });
      assert.ok(error, `debe rechazar ${JSON.stringify(clave)}`);
      assert.match(error.message, /SEED_ADMIN_PASSWORD/);
      assert.equal(await usuarioPorCorreo(email), undefined);
      assert.deepEqual(await contarCentral(), antes);
    }
  });

  await t.test('contraseña ausente con correo ya existente no falla ni cambia nada', async () => {
    const email = correo();
    await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: nuevaClave() });
    const antes = await usuarioPorCorreo(email);
    const { error, resultado } = await correr({ SEED_ADMIN_EMAIL: email });
    assert.equal(error, undefined);
    assert.equal(resultado.adminId, antes.id);
    assert.deepEqual(await usuarioPorCorreo(email), antes);
  });

  await t.test('correo con mayúsculas y espacios se normaliza y se reconoce después', async () => {
    const email = correo('seedprod-mix');
    const clave = nuevaClave();
    const { error } = await correr({ SEED_ADMIN_EMAIL: `  ${email.toUpperCase()}  `, SEED_ADMIN_PASSWORD: clave });
    assert.equal(error, undefined);
    const filas = await query('SELECT email FROM usuarios WHERE LOWER(email) = :email', { email });
    assert.deepEqual(filas.map((f) => f.email), [email]);
    const antes = await usuarioPorCorreo(email);
    const segunda = await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: nuevaClave() });
    assert.equal(segunda.error, undefined);
    assert.equal(segunda.resultado.adminId, antes.id);
    assert.deepEqual(await usuarioPorCorreo(email), antes);
  });

  await t.test('ninguna salida de consola contiene la contraseña ni el hash', async () => {
    const email = correo(); const clave = nuevaClave(); const otra = nuevaClave();
    const salidas = [];
    salidas.push(...(await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: clave })).salida);
    salidas.push(...(await correr({ SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: otra })).salida);
    const debil = 'corta1';
    salidas.push(...(await correr({ SEED_ADMIN_EMAIL: correo(), SEED_ADMIN_PASSWORD: debil })).salida);
    const { password_hash: hash } = await usuarioPorCorreo(email);
    assert.ok(salidas.length > 0);
    for (const linea of salidas) {
      assert.ok(!linea.includes(clave) && !linea.includes(otra) && !linea.includes(debil) && !linea.includes(hash), 'la salida filtra un secreto');
    }
  });
});

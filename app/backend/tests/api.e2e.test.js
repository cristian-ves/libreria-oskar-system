const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/db');
const seed = require('../src/database/seed');
const { mockExternalFetch, googleBooksResponse } = require('./helpers/httpMocks');

test('Test E2E de la API RESTful (Express + PostgreSQL)', async (t) => {
  let server;
  let baseUrl;
  let seededData;
  let adminToken;
  let employeeToken;

  await t.test('Inicializar Servidor de Pruebas y Semilla', async () => {
    seededData = await seed();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });
    assert.ok(baseUrl);
  });

  await t.test('GET /api/health - Monitoreo de salud del sistema', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'healthy');
    assert.strictEqual(json.database.connected, true);
  });

  await t.test('GET /api/bodegas - Conserva los datos planos y ordenados con sucursal', async () => {
    const res = await fetch(`${baseUrl}/bodegas`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data));

    const bodegaSeed = json.data.find((bodega) => bodega.id === seededData.bodegaId);
    assert.ok(bodegaSeed, 'Debe incluir la bodega sembrada para pruebas');
    assert.ok(bodegaSeed.nombre);
    assert.ok(typeof bodegaSeed.sucursal_nombre === 'string');
    assert.deepStrictEqual(Object.keys(bodegaSeed).sort(), [
      'descripcion', 'id', 'nombre', 'sucursal_nombre',
    ]);
    assert.deepStrictEqual(json.data, [...json.data].sort((a, b) =>
      a.sucursal_nombre.localeCompare(b.sucursal_nombre) || a.nombre.localeCompare(b.nombre)
    ));
  });

  await t.test('POST /api/auth/login - Obtener token de administrador', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@libreriaoskar.com',
        password: 'Admin123!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    adminToken = json.data.token;
    assert.ok(adminToken);
  });

  await t.test('GET /api/usuarios - Requiere administrador y no expone credenciales', async () => {
    const sinSesion = await fetch(`${baseUrl}/usuarios`);
    assert.strictEqual(sinSesion.status, 401);

    const loginEmpleado = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'empleado@libreriaoskar.com',
        password: 'Empleado123!',
      }),
    });
    assert.strictEqual(loginEmpleado.status, 200);
    employeeToken = (await loginEmpleado.json()).data.token;
    assert.ok(employeeToken);

    const empleadoRes = await fetch(`${baseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert.strictEqual(empleadoRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const json = await adminRes.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.data.some((usuario) => usuario.id === seededData.adminId));
    assert.ok(json.data.some((usuario) => usuario.id === seededData.usuarioId));

    json.data.forEach((usuario) => {
      assert.ok(usuario.rol_nombre);
      assert.deepStrictEqual(Object.keys(usuario).sort(), [
        'email', 'id', 'nombre_completo', 'rol_nombre',
      ]);
      assert.equal('password_hash' in usuario, false);
      assert.equal('dos_factores_secreto' in usuario, false);
      assert.equal('token_recuperacion' in usuario, false);
    });
    assert.deepStrictEqual(json.data, [...json.data].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo)
    ));
  });

  await t.test('POST /api/libros/escanear - Error 400 si faltan datos requeridos', async () => {
    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        isbn: '',
        bodegaId: seededData.bodegaId,
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.status, 'fail');
    assert.ok(json.message);
  });

  await t.test('POST /api/libros/escanear - Escaneo exitoso con respuesta HTTP estructurada', async (t) => {
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780135957059');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        isbn: '9780135957059', // The Pragmatic Programmer
        bodegaId: seededData.bodegaId,
        usuarioId: seededData.usuarioId,
      }),
    });

    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(json.data.libro);
    assert.strictEqual(json.data.libro.isbn, '9780135957059');
    assert.strictEqual(json.data.movimiento.tipo, 'Ingreso');
    assert.strictEqual(json.data.movimiento.cantidad, 1);
    assert.ok(json.data.inventario.stock_actual >= 1);
    assert.ok(externalCalls.length <= 1, 'El escaneo debe usar solo el mock de Google si el libro no existe localmente');
  });


  // ── Nuevos casos: autorización y actor del movimiento ──────────────────────

  await t.test('POST /api/libros/escanear - 401 sin token', async () => {
    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn: '9780135957059', bodegaId: seededData.bodegaId }),
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/libros/escanear - 403 con token de rol Usuario', async () => {
    const bcrypt = require('bcryptjs');
    const { Usuario, Rol } = require('../src/models');
    const rolUsuario = await Rol.findOne({ where: { nombre: 'Usuario' } });
    assert.ok(rolUsuario, 'El rol "Usuario" debe existir en BD');

    const uniqueEmail = `test-rol-usuario-${Date.now()}@libreriaoskar-test.com`;
    const hash = await bcrypt.hash('Test123!', 10);
    const nuevoUsuario = await Usuario.create({
      rol_id: rolUsuario.id,
      nombre_completo: 'Usuario de Prueba Temporal',
      email: uniqueEmail,
      password_hash: hash,
      activo: true,
    });

    try {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail, password: 'Test123!' }),
      });
      assert.strictEqual(loginRes.status, 200);
      const usuarioToken = (await loginRes.json()).data.token;
      assert.ok(usuarioToken);

      const res = await fetch(`${baseUrl}/libros/escanear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuarioToken}` },
        body: JSON.stringify({ isbn: '9780135957059', bodegaId: seededData.bodegaId }),
      });
      assert.strictEqual(res.status, 403);
    } finally {
      await nuevoUsuario.destroy();
    }
  });

  await t.test('POST /api/libros/escanear - 2xx con token de Empleado', async (t) => {
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780201633610');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        isbn: '9780201633610', // The Pragmatic Programmer 2nd alt ISBN
        bodegaId: seededData.bodegaId,
      }),
    });
    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(json.data.libro);
    assert.strictEqual(json.data.movimiento.tipo, 'Ingreso');
    assert.ok(externalCalls.length <= 1);
  });

  await t.test('POST /api/libros/escanear - usuarioId del body se ignora; actor = usuario autenticado', async (t) => {
    const fakeUsuarioId = '00000000-dead-beef-0000-000000000000';
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780132350884');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        isbn: '9780132350884',
        bodegaId: seededData.bodegaId,
        usuarioId: fakeUsuarioId,
      }),
    });
    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    const movimientoId = json.data.movimiento.id;
    assert.ok(movimientoId);

    // Verificar en BD que el actor del movimiento es el Empleado, no el falso
    const { rows } = await db.pool.query(
      'SELECT usuario_id FROM movimientos_inventario WHERE id = $1',
      [movimientoId]
    );
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].usuario_id, seededData.usuarioId, 'El actor debe ser el Empleado autenticado');
    assert.notStrictEqual(rows[0].usuario_id, fakeUsuarioId, 'El usuarioId falso del body debe haber sido ignorado');
    assert.ok(externalCalls.length <= 1);
  });

  await t.test('Cerrar Servidor y Pool de Conexiones', async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  });
});

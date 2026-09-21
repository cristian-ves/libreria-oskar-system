const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/db');
const seed = require('../src/database/seed');

test('Test E2E de la API RESTful (Express + PostgreSQL)', async (t) => {
  let server;
  let baseUrl;
  let seededData;
  let adminToken;

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

  await t.test('POST /api/libros/escanear - Escaneo exitoso con respuesta HTTP estructurada', async () => {
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
  });

  await t.test('Cerrar Servidor y Pool de Conexiones', async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  });
});

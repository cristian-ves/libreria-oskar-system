const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const seed = require('../src/database/seed');
const { Categoria, Libro, Rol, Usuario } = require('../src/models');

test('GET /api/categorias/admin requiere Administrador y devuelve conteos agrupados', async (t) => {
  let server;
  let baseUrl;
  let categoria;
  let adminToken;
  let empleadoToken;
  let usuarioToken;
  let usuarioTemporal;
  const libros = [];

  const autenticar = async (email, password) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).data.token;
  };

  try {
    await seed();
    categoria = await Categoria.create({ nombre: `Conteo administrativo ${Date.now()}` });
    const rolUsuario = await Rol.findOne({ where: { nombre: 'Usuario' } });
    usuarioTemporal = await Usuario.create({
      rol_id: rolUsuario.id,
      nombre_completo: 'Usuario temporal conteo categorías',
      email: `conteo-categorias-${Date.now()}@test.local`,
      password_hash: await bcrypt.hash('Temporal123!', 4),
      activo: true,
    });

    await t.test('Prepara servidor y tokens', async () => {
      server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      adminToken = await autenticar('admin@libreriaoskar.com', 'Admin123!');
      empleadoToken = await autenticar('empleado@libreriaoskar.com', 'Empleado123!');
      usuarioToken = await autenticar(usuarioTemporal.email, 'Temporal123!');
    });

    await t.test('Limita acceso a Administrador', async () => {
      assert.equal((await fetch(`${baseUrl}/categorias/admin`)).status, 401);
      assert.equal((await fetch(`${baseUrl}/categorias/admin`, { headers: { Authorization: `Bearer ${empleadoToken}` } })).status, 403);
      assert.equal((await fetch(`${baseUrl}/categorias/admin`, { headers: { Authorization: `Bearer ${usuarioToken}` } })).status, 403);
    });

    await t.test('Devuelve la cantidad correcta y mantiene el contrato público intacto', async () => {
      for (const [titulo, isbn] of [
        ['Conteo categoría libro uno', '9780306406157'],
        ['Conteo categoría libro dos', '9780131103627'],
      ]) {
        const libro = await Libro.create({
          titulo, isbn, resena: 'Fixture temporal', precio: 0, categoria_id: categoria.id,
        });
        libros.push(libro.id);
      }

      const adminResponse = await fetch(`${baseUrl}/categorias/admin`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminResponse.status, 200);
      const adminJson = await adminResponse.json();
      assert.equal(adminJson.status, 'success');
      const actual = adminJson.data.find((item) => item.id === categoria.id);
      assert.deepEqual(actual, { id: categoria.id, nombre: categoria.nombre, libros_count: 2 });
      assert.ok(adminJson.data.every((item) => Number.isInteger(item.libros_count) && item.libros_count >= 0));

      const publicoResponse = await fetch(`${baseUrl}/categorias`);
      const publicoJson = await publicoResponse.json();
      const publico = publicoJson.data.find((item) => item.id === categoria.id);
      assert.deepEqual(publico, { id: categoria.id, nombre: categoria.nombre });
    });
  } finally {
    if (libros.length) await Libro.destroy({ where: { id: libros } });
    if (categoria) await categoria.destroy();
    if (usuarioTemporal) await usuarioTemporal.destroy();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
});

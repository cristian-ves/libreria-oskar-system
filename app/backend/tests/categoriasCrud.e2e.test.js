const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const seed = require('../src/database/seed');
const { Usuario, Rol, Categoria, Libro } = require('../src/models');

test('CRUD administrativo de categorías conserva GET público y protege escrituras', async (t) => {
  let server;
  let baseUrl;
  const categorias = [];
  const libros = [];
  let usuarioTemporal;
  let adminToken;
  let empleadoToken;
  let usuarioToken;

  const login = async (email, password) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).data.token;
  };

  const request = (method, path, token, body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    await seed();
    const rolUsuario = await Rol.findOne({ where: { nombre: 'Usuario' } });
    usuarioTemporal = await Usuario.create({
      rol_id: rolUsuario.id,
      nombre_completo: 'Usuario temporal CRUD categorías',
      email: `categorias-${Date.now()}@test.local`,
      password_hash: await bcrypt.hash('Temporal123!', 4),
      activo: true,
    });

    await t.test('Prepara autenticación y servidor temporal', async () => {
      server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      adminToken = await login('admin@libreriaoskar.com', 'Admin123!');
      empleadoToken = await login('empleado@libreriaoskar.com', 'Empleado123!');
      usuarioToken = await login(usuarioTemporal.email, 'Temporal123!');
    });

    await t.test('GET público conserva status success y objetos {id,nombre}', async () => {
      const response = await request('GET', '/categorias');
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.status, 'success');
      assert.ok(Array.isArray(json.data) && json.data.length > 0);
      assert.deepEqual(Object.keys(json.data[0]).sort(), ['id', 'nombre']);
    });

    await t.test('Escrituras exigen Administrador y permiten crear/renombrar', async () => {
      const path = '/categorias';
      assert.equal((await request('POST', path, null, { nombre: 'Temporal' })).status, 401);
      assert.equal((await request('POST', path, empleadoToken, { nombre: 'Temporal' })).status, 403);
      assert.equal((await request('POST', path, usuarioToken, { nombre: 'Temporal' })).status, 403);
      const response = await request('POST', path, adminToken, { nombre: '  CRUD temporal ' });
      assert.equal(response.status, 201);
      const created = (await response.json()).data;
      assert.equal(created.nombre, 'CRUD temporal');
      categorias.push(created.id);
      assert.equal((await request('POST', path, adminToken, { nombre: 'crud TEMPORAL' })).status, 409);
      assert.equal((await request('POST', path, adminToken, { nombre: '   ' })).status, 400);

      const renamePath = `${path}/${created.id}`;
      const sameName = await request('PUT', renamePath, adminToken, { nombre: ' CRUD temporal ' });
      assert.equal(sameName.status, 200);
      assert.equal((await sameName.json()).data.nombre, 'CRUD temporal');
      const second = await request('POST', path, adminToken, { nombre: 'Otro temporal' });
      const secondData = (await second.json()).data;
      categorias.push(secondData.id);
      assert.equal((await request('PUT', renamePath, adminToken, { nombre: 'OTRO TEMPORAL' })).status, 409);
      assert.equal((await request('PUT', `${path}/no-uuid`, adminToken, { nombre: 'válido' })).status, 400);
      assert.equal((await request('PUT', `${path}/00000000-0000-4000-8000-000000000000`, adminToken, { nombre: 'válido' })).status, 404);
      assert.equal((await request('PUT', renamePath, null, { nombre: 'Nuevo' })).status, 401);
      assert.equal((await request('PUT', renamePath, empleadoToken, { nombre: 'Nuevo' })).status, 403);
      assert.equal((await request('PUT', renamePath, usuarioToken, { nombre: 'Nuevo' })).status, 403);
    });

    await t.test('DELETE solo elimina categorías sin libros y reporta cantidad exacta', async () => {
      const categoriaId = categorias[0];
      const withBook = await Libro.create({
        titulo: 'Libro temporal para categoría CRUD', isbn: '9780306406157',
        resena: 'Temporal', precio: 0, categoria_id: categoriaId,
      });
      libros.push(withBook.id);
      const anotherBook = await Libro.create({
        titulo: 'Segundo libro temporal para categoría CRUD', isbn: '9780131103627',
        resena: 'Temporal', precio: 0, categoria_id: categoriaId,
      });
      libros.push(anotherBook.id);
      const denied = await request('DELETE', `/categorias/${categoriaId}`, adminToken);
      assert.equal(denied.status, 409);
      assert.match((await denied.json()).message, /2 libros asociados/);
      assert.equal((await request('DELETE', '/categorias/no-uuid', adminToken)).status, 400);
      assert.equal((await request('DELETE', '/categorias/00000000-0000-4000-8000-000000000000', adminToken)).status, 404);
      assert.equal((await request('DELETE', `/categorias/${categoriaId}`, null)).status, 401);
      assert.equal((await request('DELETE', `/categorias/${categoriaId}`, empleadoToken)).status, 403);
      assert.equal((await request('DELETE', `/categorias/${categoriaId}`, usuarioToken)).status, 403);

      await Libro.destroy({ where: { id: withBook.id } });
      libros.splice(libros.indexOf(withBook.id), 1);
      await Libro.destroy({ where: { id: anotherBook.id } });
      libros.splice(libros.indexOf(anotherBook.id), 1);
      const removed = await request('DELETE', `/categorias/${categoriaId}`, adminToken);
      assert.equal(removed.status, 200);
      categorias.splice(categorias.indexOf(categoriaId), 1);
      assert.equal((await request('DELETE', `/categorias/${categorias[0]}`, adminToken)).status, 200);
      categorias.splice(0, 1);
    });
  } finally {
    if (libros.length) await Libro.destroy({ where: { id: libros } });
    if (categorias.length) await Categoria.destroy({ where: { id: categorias } });
    if (usuarioTemporal) await usuarioTemporal.destroy();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
});

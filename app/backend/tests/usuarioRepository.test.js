const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const usuarioRepository = require('../src/repositories/usuario.repository');
const db = require('../src/config/db');

test('UsuarioRepository - findByEmail() recupera el usuario con rol_nombre y password_hash para autenticación', async () => {
  const email = 'admin@libreriaoskar.com';
  const usuario = await usuarioRepository.findByEmail(email.toUpperCase()); // Prueba de case-insensitivity

  assert.ok(usuario, 'Debe encontrar al usuario por email');
  assert.strictEqual(usuario.email, email);
  assert.strictEqual(typeof usuario.id, 'string');
  assert.strictEqual(usuario.rol_nombre, 'Administrador');
  assert.ok(usuario.rol, 'Debe incluir el objeto rol asociado');
  assert.strictEqual(usuario.rol.nombre, 'Administrador');
  assert.strictEqual(usuario.activo, true);

  // Debe incluir password_hash para que bcrypt pueda validar la contraseña
  assert.ok(usuario.password_hash, 'Debe contener password_hash');
  assert.ok(usuario.password_hash.startsWith('$2'), 'El hash debe tener formato bcrypt');

  // No debe exponer secretos internos no requeridos
  assert.strictEqual(usuario.dos_factores_secreto, undefined, 'No debe exponer dos_factores_secreto');
  assert.strictEqual(usuario.token_recuperacion, undefined, 'No debe exponer token_recuperacion');
});

test('UsuarioRepository - findByEmail() con email inexistente o inválido retorna null', async () => {
  const inexistente = await usuarioRepository.findByEmail('no-existe@libreriaoskar.com');
  assert.strictEqual(inexistente, null);

  const vacio = await usuarioRepository.findByEmail('');
  assert.strictEqual(vacio, null);

  const nulo = await usuarioRepository.findByEmail(null);
  assert.strictEqual(nulo, null);
});

test('UsuarioRepository - findById() busca correctamente por UUID', async () => {
  // Primero obtener el ID del admin para la prueba
  const admin = await usuarioRepository.findByEmail('admin@libreriaoskar.com');
  assert.ok(admin, 'Debe existir el admin para obtener su UUID');

  const usuario = await usuarioRepository.findById(admin.id);
  assert.ok(usuario, 'Debe encontrar al usuario por ID');
  assert.strictEqual(usuario.id, admin.id);
  assert.strictEqual(usuario.nombre_completo, admin.nombre_completo);
  assert.strictEqual(usuario.rol_nombre, 'Administrador');
  assert.strictEqual(usuario.activo, true);

  // Búsqueda con ID inexistente
  const noExiste = await usuarioRepository.findById('00000000-0000-0000-0000-000000000000');
  assert.strictEqual(noExiste, null);

  // Búsqueda con ID nulo
  const nulo = await usuarioRepository.findById(null);
  assert.strictEqual(nulo, null);
});

test('UsuarioRepository - findAll() retorna lista sin exponer password_hash ni secretos', async () => {
  const usuarios = await usuarioRepository.findAll();
  assert.ok(Array.isArray(usuarios));
  assert.ok(usuarios.length >= 2, 'Deben existir al menos admin y empleado');

  usuarios.forEach((u) => {
    assert.ok(u.id);
    assert.ok(u.email);
    assert.ok(u.rol_nombre);
    // Campos sensibles no expuestos en findAll
    assert.strictEqual(u.password_hash, undefined, 'findAll no debe exponer password_hash');
    assert.strictEqual(u.dos_factores_secreto, undefined, 'findAll no debe exponer dos_factores_secreto');
    assert.strictEqual(u.token_recuperacion, undefined, 'findAll no debe exponer token_recuperacion');
  });
});

test('UsuarioRepository - compatibilidad con cliente transaccional pg (query delegation)', async () => {
  const client = await db.pool.connect();
  try {
    const admin = await usuarioRepository.findByEmail('admin@libreriaoskar.com', client);
    assert.ok(admin, 'Debe encontrar al usuario mediante cliente pg');
    assert.strictEqual(admin.rol_nombre, 'Administrador');
    assert.ok(admin.password_hash);

    const porId = await usuarioRepository.findById(admin.id, client);
    assert.ok(porId, 'Debe encontrar al usuario por ID mediante cliente pg');
    assert.strictEqual(porId.id, admin.id);
  } finally {
    client.release();
  }
});

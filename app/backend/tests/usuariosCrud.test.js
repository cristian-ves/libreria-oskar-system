const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, Usuario, Rol } = require('../src/models');
const app = require('../src/app');
const seed = require('../src/database/seed');
const usuarioService = require('../src/services/usuario.service');

test('CRUD administrativo de usuarios y protecciones', async (t) => {
  let server; let base; let token; let seedData; const created = []; let activeAdminIdsBeforeConcurrency = [];
  const email = (suffix) => `crud-${Date.now()}-${String(suffix).toLowerCase().replace(/[^a-z0-9]+/g, '-') }@example.com`;
  const request = (path, options = {}) => fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers },
  });
  const json = (method, body, auth = token) => ({ method, token: auth, body: JSON.stringify(body) });
  const createUser = async (name, role = 'Empleado') => {
    const res = await request('/usuarios', json('POST', { nombre_completo: name, email: email(name), password: 'ClaveSegura123', rol: role }));
    assert.equal(res.status, 201); const result = (await res.json()).data; created.push(result.id); return result;
  };

  await t.test('prepara servidor y sesión administrativa', async () => {
    seedData = await seed();
    await new Promise((resolve) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; resolve(); }); });
    const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@libreriaoskar.com', password: 'Admin123!' }) });
    assert.equal(login.status, 200); token = (await login.json()).data.token;
  });

  await t.test('GET mantiene su contrato por defecto y opción de inactivos; auth y RBAC', async () => {
    assert.equal((await request('/usuarios')).status, 401);
    const empleado = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'empleado@libreriaoskar.com', password: 'Empleado123!' }) });
    const empleadoToken = (await empleado.json()).data.token;
    assert.equal((await request('/usuarios', { token: empleadoToken })).status, 403);
    const listado = await request('/usuarios', { token }); const body = await listado.json();
    assert.equal(listado.status, 200); assert.equal(body.status, 'success'); assert.ok(body.data.length);
    for (const item of body.data) assert.deepEqual(Object.keys(item).sort(), ['email', 'id', 'nombre_completo', 'rol_nombre']);
    assert.deepEqual(body.data, [...body.data].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo) || a.id.localeCompare(b.id)));
    assert.equal((await request('/usuarios?incluirInactivos=true', { token })).status, 200);
  });

  await t.test('crea usuario normalizando email y no expone datos sensibles', async () => {
    const raw = email('normalizado'); const res = await request('/usuarios', json('POST', { nombre_completo: 'Operador CRUD', email: ` ${raw.toUpperCase()} `, password: 'ClaveSegura123', rol: 'Empleado', dos_factores_activo: true, dos_factores_secreto: 'secreto', token_recuperacion: 'token' }));
    assert.equal(res.status, 201); const body = await res.json(); created.push(body.data.id);
    assert.equal(body.data.email, raw); assert.equal(body.data.activo, true);
    for (const key of ['password_hash', 'dos_factores_activo', 'dos_factores_secreto', 'token_recuperacion']) assert.equal(key in body.data, false);
    const stored = await Usuario.findByPk(body.data.id);
    assert.equal(stored.dos_factores_activo, false); assert.equal(stored.dos_factores_secreto, null); assert.equal(stored.token_recuperacion, null);
    const dup = await request('/usuarios', json('POST', { nombre_completo: 'Dup', email: raw.toUpperCase(), password: 'ClaveSegura123', rol: 'Empleado' })); assert.equal(dup.status, 409);
    const badPassword = await request('/usuarios', json('POST', { nombre_completo: 'Bad', email: email('bad-pass'), password: 'short', rol: 'Empleado' })); assert.equal(badPassword.status, 400);
    const badRole = await request('/usuarios', json('POST', { nombre_completo: 'Bad', email: email('bad-role'), password: 'ClaveSegura123', rol: 'Usuario' })); assert.equal(badRole.status, 400);
  });

  await t.test('edita usuario, valida inexistente y protege campos y rol propio', async () => {
    const user = await createUser('Editable');
    const updated = await request(`/usuarios/${user.id}`, json('PUT', { nombre_completo: 'Editado', email: ` ${email('edited')} `, rol: 'Administrador', activo: true }));
    assert.equal(updated.status, 200); assert.equal((await updated.json()).data.nombre_completo, 'Editado');
    const absent = await request('/usuarios/00000000-0000-4000-8000-000000000000', json('PUT', { nombre_completo: 'X' })); assert.equal(absent.status, 404);
    assert.equal((await request('/usuarios/no-es-uuid', json('PUT', { nombre_completo: 'X' }))).status, 400);
    const duplicate = await request(`/usuarios/${user.id}`, json('PUT', { email: 'admin@libreriaoskar.com' })); assert.equal(duplicate.status, 409);
    const self = await request(`/usuarios/${seedData.adminId}`, json('PUT', { rol: 'Empleado' })); assert.equal(self.status, 400);
    const selfUppercaseId = await request(`/usuarios/${seedData.adminId.toUpperCase()}`, json('PUT', { rol: 'Empleado' })); assert.equal(selfUppercaseId.status, 400);
    const forbiddenField = await request(`/usuarios/${user.id}`, json('PUT', { password: 'OtroPassword123' })); assert.equal(forbiddenField.status, 400);
  });

  await t.test('activa/desactiva, tokens desactivados fallan y evita auto desactivación', async () => {
    const user = await createUser('Toggle');
    const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'ClaveSegura123' }) });
    const userToken = (await login.json()).data.token;
    const off = await request(`/usuarios/${user.id}/activo`, json('PATCH', { activo: false })); assert.equal(off.status, 200);
    assert.equal((await request('/auth/me', { token: userToken })).status, 401);
    const on = await request(`/usuarios/${user.id}/activo`, json('PATCH', { activo: true })); assert.equal(on.status, 200);
    const self = await request(`/usuarios/${seedData.adminId}/activo`, json('PATCH', { activo: false })); assert.equal(self.status, 400);
  });

  await t.test('protege el último administrador y serializa desactivaciones concurrentes', async () => {
    const currentAdmins = await Usuario.findAll({ attributes: ['id'], where: { activo: true }, include: [{ model: Rol, as: 'rol', attributes: [], where: { nombre: 'Administrador' } }] });
    activeAdminIdsBeforeConcurrency = currentAdmins.map(({ id }) => id);
    const a = await createUser('Admin A', 'Administrador'); const b = await createUser('Admin B', 'Administrador'); const c = await createUser('Admin C', 'Administrador');
    for (const id of activeAdminIdsBeforeConcurrency) await usuarioService.cambiarActivo(id, false, b.id);
    const results = await Promise.all([a.id, c.id].map((id) => usuarioService.cambiarActivo(id, false, b.id).then(() => true, () => false)));
    assert.equal(results.filter(Boolean).length, 2);
    const activeAdmins = await Usuario.findAll({ attributes: ['id'], where: { activo: true }, include: [{ model: Rol, as: 'rol', attributes: [], where: { nombre: 'Administrador' } }] });
    assert.deepEqual(activeAdmins.map(({ id }) => id), [b.id]);
    await assert.rejects(usuarioService.cambiarActivo(b.id, false, seedData.usuarioId), (err) => err.statusCode === 409);
  });

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (activeAdminIdsBeforeConcurrency.length) await Usuario.update({ activo: true }, { where: { id: activeAdminIdsBeforeConcurrency } });
    if (created.length) await Usuario.destroy({ where: { id: created }, force: true });
    await sequelize.close();
  });
});

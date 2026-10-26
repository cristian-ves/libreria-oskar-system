const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { sequelize, Sucursal, Bodega, Rol, Usuario, Libro, Inventario, AlertaInventarioReporte, AlertaInventarioEntrega } = require('../src/models');
const repository = require('../src/repositories/alertasInventario.repository');

const tag = `alertas-${Date.now()}`;
let sucursal; let bodegaA; let bodegaB; let adminRole; let empleadoRole;
const libros = []; const inventarios = []; const usuarios = [];
const reportIds = [];
let hasAlertTables = false;

before(async () => {
  const [tableCheck] = await sequelize.query("SELECT to_regclass('alertas_inventario_reportes') IS NOT NULL AS existe");
  hasAlertTables = tableCheck[0].existe;
  sucursal = await Sucursal.create({ nombre: `Sucursal ${tag}`, direccion: 'Fixture' });
  bodegaA = await Bodega.create({ sucursal_id: sucursal.id, nombre: `Bodega A ${tag}` });
  bodegaB = await Bodega.create({ sucursal_id: sucursal.id, nombre: `Bodega B ${tag}` });
  adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
  empleadoRole = await Rol.findOne({ where: { nombre: 'Empleado' } });
  const add = async ({ i, stock = 0, minimum = 5, active = true, warehouse = bodegaA } = {}) => {
    const libro = await Libro.create({ titulo: `Alerta ${tag} ${i}`, resena: 'Fixture alertas', precio: 10, activo: active });
    libros.push(libro);
    const inventory = await Inventario.create({ libro_id: libro.id, bodega_id: warehouse.id, stock_actual: stock, stock_minimo: minimum });
    inventarios.push(inventory);
    return inventory;
  };
  await add({ i: 0, stock: 2, minimum: 5 });
  await add({ i: 1, stock: 3, minimum: 3 });
  await add({ i: 2, stock: 0, minimum: 0, warehouse: bodegaB });
  await add({ i: 3, stock: 0, minimum: 7, active: false });
  for (let i = 4; i < 16; i += 1) await add({ i, stock: 0, minimum: i, warehouse: i % 2 ? bodegaA : bodegaB });
  for (const [role, active, suffix] of [[adminRole, true, 'admin'], [adminRole, false, 'inactive'], [empleadoRole, true, 'employee']]) {
    const user = { id: randomUUID(), email: `${suffix}-${tag}@example.test` };
    await sequelize.query(
      'INSERT INTO usuarios (id, rol_id, nombre_completo, email, password_hash, activo) VALUES ($1, $2, $3, $4, $5, $6)',
      { bind: [user.id, role.id, suffix, user.email, 'fixture', active] },
    );
    usuarios.push(user);
  }
});

after(async () => {
  try {
    await AlertaInventarioReporte.destroy({ where: { id: reportIds } }).catch(() => {});
    await Inventario.destroy({ where: { id: inventarios.map((i) => i.id) } });
    await Libro.destroy({ where: { id: libros.map((l) => l.id) } });
    await Usuario.destroy({ where: { id: usuarios.map((u) => u.id) } });
    if (bodegaA && bodegaB) await Bodega.destroy({ where: { id: [bodegaA.id, bodegaB.id] } });
    if (sucursal) await Sucursal.destroy({ where: { id: sucursal.id } });
  } finally {
    await sequelize.close();
  }
});

test('alertas incluyen <=, stock cero, mínimo cero, más de diez y varias bodegas; excluyen libros inactivos', async () => {
  const rows = await repository.listarAlertas();
  const own = rows.filter((row) => libros.some((l) => l.id === row.libro_id));
  assert.equal(own.length, 15);
  assert.ok(own.some((r) => r.stock_actual === 3 && r.stock_minimo === 3));
  assert.ok(own.some((r) => r.stock_actual === 0 && r.stock_minimo === 0));
  assert.ok(own.every((r) => r.deficit === r.stock_minimo - r.stock_actual));
  assert.equal(new Set(own.map((r) => r.bodega)).size, 2);
  assert.ok(own.length > 10);
  assert.ok(own.every((r) => r.titulo !== `Alerta ${tag} 3`));
});

test('destinatarios requieren administrador activo y admite varios', async () => {
  const rows = await repository.listarAdministradores();
  const own = rows.filter((row) => usuarios.some((u) => u.id === row.id));
  assert.equal(own.length, 1);
  assert.equal(own[0].email, usuarios[0].email);
});

test('reporte diario concurrente y reclamo de entrega son únicos', async (t) => {
  if (!hasAlertTables) return t.skip('libreria_oskar_test tiene un esquema antiguo sin migración 020.');
  const fechaLocal = `2099-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  const administradores = [{ id: usuarios[0].id, email: usuarios[0].email, nombre_completo: usuarios[0].nombre_completo }];
  const create = () => repository.prepararReporte({ fechaLocal, alertas: [], administradores });
  const reports = await Promise.all([create(), create()]);
  reportIds.push(reports[0].id);
  assert.equal(reports[0].id, reports[1].id);
  const entregas = await repository.listarEntregas(reports[0].id);
  assert.equal(entregas.length, 1);
  const claims = await Promise.all([
    repository.reclamarEntrega(entregas[0].id, '00000000-0000-4000-8000-000000000001', 10000),
    repository.reclamarEntrega(entregas[0].id, '00000000-0000-4000-8000-000000000002', 10000),
  ]);
  assert.equal(claims.filter((claim) => claim.claimed).length, 1);
  await AlertaInventarioReporte.destroy({ where: { id: reports[0].id } });
});

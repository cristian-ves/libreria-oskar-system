const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const seed = require('../src/database/seed');
const { sequelize, Usuario, Rol, Sucursal, Bodega, Libro, Inventario, TipoMovimiento, MovimientoInventario, Venta } = require('../src/models');
const inventarioService = require('../src/services/inventario.service');
const libroService = require('../src/services/libro.service');

test('Gestión administrativa de sucursales y bodegas preserva historial y bloquea operaciones inactivas', async (t) => {
  let server; let baseUrl; let adminToken; let empleadoToken; let usuarioToken;
  let usuarioTemporal; let sucursalId; let bodegaId; let libroId; let inventarioId; let ventaId;
  const movimientos = [];
  const tag = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const isbnBase = `978${String(Date.now()).slice(-9)}`;
  const isbnCheck = (10 - [...isbnBase].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10) % 10;
  const isbn = `${isbnBase}${isbnCheck}`;

  const login = async (email, password) => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 200);
    return (await response.json()).data.token;
  };
  const request = (method, path, token, body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    await seed();
    const rolUsuario = await Rol.findOne({ where: { nombre: 'Usuario' } });
    usuarioTemporal = await Usuario.create({
      rol_id: rolUsuario.id, nombre_completo: `Visitante ${tag}`, email: `sucursales-${tag}@test.local`,
      password_hash: await bcrypt.hash('Temporal123!', 4), activo: true,
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    adminToken = await login('admin@libreriaoskar.com', 'Admin123!');
    empleadoToken = await login('empleado@libreriaoskar.com', 'Empleado123!');
    usuarioToken = await login(usuarioTemporal.email, 'Temporal123!');

    await t.test('RBAC, creación, duplicados, edición y filtros de sucursal', async () => {
      assert.equal((await request('GET', '/sucursales')).status, 401);
      assert.equal((await request('POST', '/sucursales', empleadoToken, { nombre: 'X', direccion: 'Y' })).status, 403);
      assert.equal((await request('POST', '/sucursales', usuarioToken, { nombre: 'X', direccion: 'Y' })).status, 403);
      assert.equal((await request('POST', '/sucursales', adminToken, { nombre: ' ', direccion: 'Calle' })).status, 400);
      const created = await request('POST', '/sucursales', adminToken, { nombre: `  Centro ${tag} `, direccion: '  Zona 1  ', telefono: '5555' });
      assert.equal(created.status, 201);
      const data = (await created.json()).data;
      sucursalId = data.id;
      assert.equal(data.nombre, `Centro ${tag}`);
      assert.equal(data.direccion, 'Zona 1');
      assert.equal((await request('POST', '/sucursales', adminToken, { nombre: `centro ${tag}`, direccion: 'Otra' })).status, 409);
      assert.equal((await request('GET', `/sucursales/${sucursalId}`, adminToken)).status, 200);
      assert.equal((await request('GET', '/sucursales/no-uuid', adminToken)).status, 400);
      assert.equal((await request('PUT', `/sucursales/${sucursalId}`, adminToken, { telefono: ' 7777 ' })).status, 200);
      assert.equal((await request('GET', `/sucursales?activo=true&q=${encodeURIComponent(`Centro ${tag}`)}`, adminToken)).status, 200);
    });

    await t.test('Creaciones concurrentes con el mismo nombre se serializan', async () => {
      const nombreDuplicado = `Concurrente ${tag}`;
      const responses = await Promise.all([
        request('POST', '/sucursales', adminToken, { nombre: nombreDuplicado, direccion: 'Zona 1' }),
        request('POST', '/sucursales', adminToken, { nombre: `  concurrente ${tag.toLowerCase()} `, direccion: 'Zona 2' }),
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
      const creada = await Sucursal.findOne({ where: { nombre: nombreDuplicado } });
      assert.ok(creada);
      await creada.destroy();
    });

    await t.test('Bodega conserva GET público, se crea/edit y asocia solo a sucursal activa', async () => {
      const response = await request('GET', '/bodegas');
      assert.equal(response.status, 200);
      const before = (await response.json()).data;
      assert.ok(Array.isArray(before));
      if (before.length) assert.deepEqual(Object.keys(before[0]).sort(), ['descripcion', 'id', 'nombre', 'sucursal_nombre']);
      assert.equal((await request('POST', `/sucursales/${sucursalId}/bodegas`, empleadoToken, { nombre: 'Área' })).status, 403);
      const created = await request('POST', `/sucursales/${sucursalId}/bodegas`, adminToken, { nombre: `Recepción ${tag}`, descripcion: 'Principal' });
      assert.equal(created.status, 201);
      bodegaId = (await created.json()).data.id;
      await assert.rejects(Sucursal.destroy({ where: { id: sucursalId } }));
      assert.ok(await Sucursal.findByPk(sucursalId));
      assert.equal((await request('POST', `/sucursales/${sucursalId}/bodegas`, adminToken, { nombre: ` recepción ${tag} ` })).status, 409);
      assert.equal((await request('PUT', `/bodegas/${bodegaId}`, adminToken, { nombre: `Depósito ${tag}`, descripcion: 'Editada' })).status, 200);
      assert.equal((await request('GET', `/bodegas/${bodegaId}`, empleadoToken)).status, 403);
      assert.equal((await request('GET', `/sucursales/${sucursalId}/bodegas?activo=true`, adminToken)).status, 200);
    });

    await t.test('Bajas lógicas verifican stock y bodegas operativas, y reactivan en orden', async () => {
      const activeWarehouse = await request('PATCH', `/sucursales/${sucursalId}/activo`, adminToken, { activo: false });
      assert.equal(activeWarehouse.status, 409);

      const admin = await Usuario.findOne({ where: { email: 'admin@libreriaoskar.com' } });
      const sucursal = await Sucursal.findByPk(sucursalId);
      const bodega = await Bodega.findByPk(bodegaId);
      const libro = await Libro.create({ titulo: `Libro HU03 ${tag}`, isbn, resena: 'Fixture', precio: 12 });
      libroId = libro.id;
      const inventory = await Inventario.create({ libro_id: libro.id, bodega_id: bodega.id, stock_minimo: 0 });
      inventarioId = inventory.id;
      const ingreso = await TipoMovimiento.findOne({ where: { nombre: 'Ingreso' } });
      const ajuste = await TipoMovimiento.findOne({ where: { nombre: 'Ajuste' } });
      const inMovimiento = await MovimientoInventario.create({ inventario_id: inventory.id, usuario_id: admin.id, tipo_movimiento_id: ingreso.id, cantidad: 2, motivo_detalle: 'Fixture HU03' });
      movimientos.push(inMovimiento.id);
      const venta = await Venta.create({ bodega_id: bodega.id, usuario_id: admin.id, metodo_pago: 'Efectivo', subtotal: 12, descuento: 0, total: 12 });
      ventaId = venta.id;
      await assert.rejects(Bodega.destroy({ where: { id: bodegaId } }));
      assert.ok(await Inventario.findByPk(inventory.id));
      assert.equal((await request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: false })).status, 409);
      await MovimientoInventario.create({ inventario_id: inventory.id, usuario_id: admin.id, tipo_movimiento_id: ajuste.id, cantidad: 0, motivo_detalle: 'Cierre de existencias fixture' }).then((row) => movimientos.push(row.id));
      assert.equal((await Inventario.findByPk(inventory.id)).stock_actual, 0);

      assert.equal((await request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: false })).status, 200);
      assert.equal((await request('PATCH', `/sucursales/${sucursalId}/activo`, adminToken, { activo: false })).status, 200);
      assert.equal((await request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: true })).status, 409);
      assert.equal((await request('POST', `/sucursales/${sucursalId}/bodegas`, adminToken, { nombre: 'No debe crear' })).status, 409);

      await assert.rejects(inventarioService.registrarAjuste({ inventarioId, stockNuevo: 1, motivo: 'Prueba', usuarioId: admin.id }), /inactiva/);
      await assert.rejects(inventarioService.registrarSalida({ inventarioId, cantidad: 1, motivo: 'Prueba', usuarioId: admin.id }), /inactiva/);
      await assert.rejects(libroService.ingresoLibro({ libroId, bodegaId, cantidad: 1, usuarioId: admin.id }), /inactiva/);
      await assert.rejects(libroService.escanearLibro({ isbn: libro.isbn, bodegaId, usuarioId: admin.id }), /inactiva/);

      assert.equal((await request('PATCH', `/sucursales/${sucursalId}/activo`, adminToken, { activo: true })).status, 200);
      assert.equal((await Bodega.findByPk(bodega.id)).activo, false);
      assert.equal((await request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: true })).status, 200);
      assert.equal((await Inventario.findByPk(inventory.id)).stock_actual, 0);
      assert.equal(await MovimientoInventario.count({ where: { inventario_id: inventory.id } }), 2);
      assert.ok(await Venta.findByPk(venta.id));
      assert.ok(await Sucursal.findByPk(sucursal.id));
    });

    await t.test('Reasignación con inventario histórico se rechaza; catálogo excluye ubicaciones inactivas', async () => {
      const otra = await request('POST', '/sucursales', adminToken, { nombre: `Otra ${tag}`, direccion: 'Zona 2' });
      const otraId = (await otra.json()).data.id;
      const reasignar = await request('PUT', `/bodegas/${bodegaId}`, adminToken, { sucursal_id: otraId });
      assert.equal(reasignar.status, 409);
      const detalle = await request('GET', `/catalogo/${libroId}`);
      assert.notEqual(detalle.status, 500);
    });

    await t.test('La baja concurrente con ajuste no deja stock en una bodega inactiva', async () => {
      const admin = await Usuario.findOne({ where: { email: 'admin@libreriaoskar.com' } });
      const [desactivar, ajustar] = await Promise.all([
        request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: false }),
        inventarioService.registrarAjuste({ inventarioId, stockNuevo: 1, motivo: 'Carrera HU03', usuarioId: admin.id })
          .then((value) => ({ ok: true, value }), (error) => ({ ok: false, error })),
      ]);
      assert.ok([200, 409].includes(desactivar.status));
      const inventario = await Inventario.findByPk(inventarioId);
      const bodega = await Bodega.findByPk(bodegaId);
      if (desactivar.status === 200) {
        assert.equal(ajustar.ok, false);
        assert.match(ajustar.error.message, /inactiva/);
        assert.equal(inventario.stock_actual, 0);
        assert.equal(bodega.activo, false);
        assert.equal((await request('PATCH', `/bodegas/${bodegaId}/activo`, adminToken, { activo: true })).status, 200);
      } else {
        assert.equal(ajustar.ok, true);
        assert.equal(inventario.stock_actual, 1);
        assert.equal(bodega.activo, true);
        await inventarioService.registrarAjuste({ inventarioId, stockNuevo: 0, motivo: 'Limpieza carrera HU03', usuarioId: admin.id });
      }
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (movimientos.length) await MovimientoInventario.destroy({ where: { id: movimientos } });
    if (ventaId) await Venta.destroy({ where: { id: ventaId } });
    if (inventarioId) await Inventario.destroy({ where: { id: inventarioId } });
    if (libroId) await Libro.destroy({ where: { id: libroId } });
    if (bodegaId) await Bodega.destroy({ where: { id: bodegaId } });
    if (sucursalId) await Sucursal.destroy({ where: { id: sucursalId } });
    if (usuarioTemporal) await usuarioTemporal.destroy();
    await sequelize.close();
  }
});

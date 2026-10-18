const test = require('node:test');
const assert = require('node:assert');
const { testSequelizeConnection } = require('../src/config/sequelize');
const models = require('../src/models');

test('Sequelize - Conexión y autenticación exitosa a PostgreSQL sin modificar datos', async () => {
  const connInfo = await testSequelizeConnection();
  assert.ok(connInfo, 'Debe retornar información de conexión');
  assert.strictEqual(typeof connInfo.db_name, 'string');
  assert.ok(connInfo.current_time, 'Debe retornar la hora del servidor de base de datos');
});

test('Sequelize - Los 11 modelos requeridos están correctamente definidos', () => {
  const modelKeys = [
    'Sucursal',
    'Bodega',
    'Rol',
    'Usuario',
    'Autor',
    'Editorial',
    'Categoria',
    'Libro',
    'Inventario',
    'TipoMovimiento',
    'MovimientoInventario',
  ];

  modelKeys.forEach((key) => {
    assert.ok(models[key], `El modelo ${key} debe estar definido`);
    assert.strictEqual(typeof models[key].findAll, 'function', `El modelo ${key} debe tener métodos de consulta Sequelize`);
  });
});

test('Sequelize - Lectura de catálogos y datos maestros sin modificar la base de datos', async () => {
  // 1. Roles
  const roles = await models.Rol.findAll({ raw: true });
  assert.ok(Array.isArray(roles) && roles.length >= 3, 'Deben existir al menos 3 roles');
  const roleNames = roles.map((r) => r.nombre);
  assert.ok(roleNames.includes('Administrador'));
  assert.ok(roleNames.includes('Empleado'));
  assert.ok(roleNames.includes('Usuario'));

  // 2. Tipos de movimientos
  const tipos = await models.TipoMovimiento.findAll({ raw: true });
  assert.ok(Array.isArray(tipos) && tipos.length >= 3, 'Deben existir al menos 3 tipos de movimiento');
  const tipoNames = tipos.map((t) => t.nombre);
  assert.ok(tipoNames.includes('Ingreso'));
  assert.ok(tipoNames.includes('Salida'));

  // 3. Categorías
  const categorias = await models.Categoria.findAll({ raw: true });
  assert.ok(Array.isArray(categorias) && categorias.length > 0, 'Deben existir categorías registradas');
});

test('Sequelize - Lectura con asociaciones y claves foráneas (Eager Loading con include)', async () => {
  // 1. Usuarios con su Rol asociado (belongsTo)
  const usuarios = await models.Usuario.findAll({
    include: [{ model: models.Rol, as: 'rol' }],
    limit: 5,
  });
  assert.ok(Array.isArray(usuarios) && usuarios.length > 0, 'Deben existir usuarios registrados');
  usuarios.forEach((u) => {
    assert.ok(u.id, 'El usuario debe tener UUID');
    assert.ok(u.rol, 'El usuario debe tener su Rol asociado');
    assert.ok(u.rol.nombre, 'El rol debe tener nombre');
  });

  // 2. Bodegas con su Sucursal asociada (belongsTo)
  const bodegas = await models.Bodega.findAll({
    include: [{ model: models.Sucursal, as: 'sucursal' }],
    limit: 5,
  });
  assert.ok(Array.isArray(bodegas) && bodegas.length > 0, 'Deben existir bodegas');
  bodegas.forEach((b) => {
    assert.ok(b.sucursal, 'La bodega debe tener su sucursal asociada');
  });

  // 3. Libros con relaciones (Autor, Editorial, Categoria, Inventarios)
  const libros = await models.Libro.findAll({
    include: [
      { model: models.Autor, as: 'autor' },
      { model: models.Editorial, as: 'editorial' },
      { model: models.Categoria, as: 'categoria' },
      { model: models.Inventario, as: 'inventarios' },
    ],
    limit: 5,
  });
  assert.ok(Array.isArray(libros), 'La consulta de libros debe retornar un arreglo');
});

test('Sequelize - Cierre de conexión al finalizar pruebas', async () => {
  await models.sequelize.close();
  assert.ok(true, 'Conexión de Sequelize cerrada correctamente');
});
